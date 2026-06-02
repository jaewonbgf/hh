const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 아이 사진 제공: /img/hn (이해나), /img/hs (이해성)
// 확장자(jpg/png/webp 등)를 몰라도 자동으로 찾아서 보여줌. 없으면 404 → 프론트가 이모지로 대체
const IMG_DIR = path.join(__dirname, "img");
app.get("/img/:who", (req, res, next) => {
  const who = req.params.who;
  if (!["hn", "hh", "hs"].includes(who)) return next();
  const exts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".JPG", ".PNG"];
  for (const e of exts) {
    const f = path.join(IMG_DIR, who + e);
    if (fs.existsSync(f)) return res.sendFile(f);
  }
  res.status(404).end();
});

// 캐릭터 데이터 로드 (수정 시 서버 재시작하면 반영)
function loadCharacters() {
  const raw = fs.readFileSync(path.join(__dirname, "characters.json"), "utf-8");
  return JSON.parse(raw).characters;
}

// ── 룰베이스 추천 점수 ──────────────────────────────
// 비슷한 말끼리 묶어서 키워드가 살짝 달라도 매칭되게 함
const SYNONYMS = {
  "멋진":   ["스타일리시", "시크한", "멋진", "인기많은"],
  "강한":   ["강력한", "강한", "힘센", "액션", "배틀", "슈팅", "보스"],
  "무서운": ["무서운", "호러", "몬스터", "스릴", "퇴마사"],
  "웃긴":   ["웃긴", "엉뚱한", "장난꾸러기", "유머러스", "밈"],
  "똑똑한": ["똑똑한", "발명", "진지한", "리더십"],
  "신비한": ["신비한", "마법", "전설", "변신"],
  "활발한": ["활발한", "에너지", "빠른"],
  "귀여운": ["귀여운", "사랑", "사랑스러운", "다정한", "착한", "순수한"],
  "모험":   ["모험", "탐험", "생존", "배틀"],
  "변신":   ["변신", "로봇", "마법"],
  "수집":   ["수집", "진화"],
  "만들기": ["만들기", "건축", "발명"],
  "춤추기": ["춤추기", "음악", "노래"],
  "하양":   ["하양", "하얀색"],
};

// 키워드 한 질문에 대한 점수: 정확히 일치 +3, 비슷한 말은 +1씩
// cap 으로 차원별 상한을 둬서 한 질문이 점수를 독식하지 못하게 함
function matchKeyword(c, value, cap) {
  if (!value || value === "any") return 0;
  let s = 0;
  if (c.keywords.includes(value)) s += 3;
  (SYNONYMS[value] || []).forEach((k) => {
    if (c.keywords.includes(k)) s += 1;
  });
  return Math.min(s, cap);
}

// 부드러운 키워드 질문과 차원별 상한
const KEYWORD_DIMS = [
  { key: "mood", cap: 4 },
  { key: "color", cap: 3 },
  { key: "activity", cap: 4 },
  { key: "animal", cap: 4 },
  { key: "personality", cap: 4 },
];

// 점수 항목별 내역까지 반환 (디버깅/설명용)
function scoreCharacter(c, a) {
  const parts = {};

  // 성별 — 강한 선호 (반대 성별 타겟이면 크게 감점)
  if (a.gender) {
    if (c.target_gender === a.gender) parts.gender = 6;
    else if (c.target_gender === "공통") parts.gender = 2;
    else parts.gender = -5;
  }

  // 종류/카테고리 — 강한 선호. 시리즈(sub)까지 맞으면 추가점, 아예 다르면 살짝 감점
  if (a.type && a.type !== "any") {
    const inCat = c.category.includes(a.type);
    const inSub = (c.sub_category || "").includes(a.type);
    if (inCat || inSub) parts.type = 6 + (inSub ? 2 : 0);
    else parts.type = -1;
  }

  // 나이대 — 해나(저학년)·해성(유치원) 둘 다 어림 → 고학년 전용은 약하게 감점
  if (c.target_age === "고학년") parts.age = -2;

  // 누가 쓰는지(who) — 해나/해성이면 어린 나이대 캐릭터에 약간 가산
  if (a.who === "hana" || a.who === "haesung") {
    if (["유치원", "저학년", "전학년"].includes(c.target_age)) parts.who = 1;
  }

  // 부드러운 키워드 질문들
  for (const { key, cap } of KEYWORD_DIMS) {
    const v = matchKeyword(c, a[key], cap);
    if (v) parts[key] = v;
  }

  const total = Object.values(parts).reduce((sum, v) => sum + v, 0);
  return { total, parts };
}

// 함께 추천은 1위와 다른 시리즈(sub_category)로 다양하게 고름
function pickRunners(ranked, top, count) {
  const runners = [];
  const usedSubs = new Set([top.sub_category]);
  // 1차: 아직 안 나온 시리즈에서
  for (const c of ranked) {
    if (runners.length >= count) break;
    if (c.id === top.id) continue;
    if (usedSubs.has(c.sub_category)) continue;
    runners.push(c);
    usedSubs.add(c.sub_category);
  }
  // 2차: 부족하면 점수순으로 채움
  for (const c of ranked) {
    if (runners.length >= count) break;
    if (c.id === top.id || runners.includes(c)) continue;
    runners.push(c);
  }
  return runners;
}

// 전체 캐릭터 목록
app.get("/api/characters", (req, res) => {
  res.json(loadCharacters());
});

// 추천: { gender, type, mood, color, activity, animal, personality } → { top, runners }
app.post("/api/recommend", (req, res) => {
  const answers = req.body || {};
  const ranked = loadCharacters()
    .map((c) => {
      const { total, parts } = scoreCharacter(c, answers);
      return { ...c, score: total, score_parts: parts };
    })
    .sort((x, y) => y.score - x.score);

  const top = ranked[0];
  const runners = pickRunners(ranked, top, 2);
  res.json({ top, runners });
});

app.listen(PORT, () => {
  console.log(`🎀 캐릭터 찾기 서버 실행 중 → http://localhost:${PORT}`);
});
