// Cloudflare Worker 진입점 (정적 자산 + 누적 랭킹 API)
//
//  - /api/scores  : KV(LEADERBOARD)에 점수를 저장/조회하는 API
//  - 그 외 경로    : public/ 정적 자산을 그대로 서빙 (env.ASSETS)
//
// wrangler.jsonc 에서 main="worker.js", assets.binding="ASSETS",
// kv_namespaces 바인딩 "LEADERBOARD" 가 설정되어 있어야 합니다.

const BOARD_KEY = "board";
const MAX_ENTRIES = 100;   // 보관할 최대 기록 수
const MAX_NAME_LEN = 12;   // 이름 최대 길이
const MAX_SCORE = 100000;  // 비정상 점수 차단용 상한

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

// 이름 정제: 제어문자 제거, 앞뒤 공백 정리, 길이 제한. 비면 "익명".
function cleanName(raw) {
  let s = (typeof raw === "string" ? raw : "").replace(/[\x00-\x1f\x7f]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > MAX_NAME_LEN) s = s.slice(0, MAX_NAME_LEN);
  return s || "익명";
}

function cleanScore(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, MAX_SCORE);
}

async function readBoard(env) {
  if (!env || !env.LEADERBOARD) return [];
  const txt = await env.LEADERBOARD.get(BOARD_KEY);
  if (!txt) return [];
  try {
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function handleGet(env) {
  const board = await readBoard(env);
  return json({ ok: true, scores: board.slice(0, 50) });
}

async function handlePost(request, env) {
  if (!env || !env.LEADERBOARD) {
    return json({ ok: false, error: "KV(LEADERBOARD) 바인딩이 설정되지 않았어요." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "잘못된 요청 형식이에요." }, 400);
  }

  const name = cleanName(body && body.name);
  const score = cleanScore(body && body.score);
  const character = cleanName(body && body.character).slice(0, 20);
  if (score === null) {
    return json({ ok: false, error: "점수가 올바르지 않아요." }, 400);
  }

  const entry = { name, score, character, ts: Date.now() };
  const board = await readBoard(env);
  board.push(entry);
  board.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const trimmed = board.slice(0, MAX_ENTRIES);
  await env.LEADERBOARD.put(BOARD_KEY, JSON.stringify(trimmed));

  const rank =
    trimmed.findIndex(
      (e) => e.ts === entry.ts && e.name === entry.name && e.score === entry.score
    ) + 1;

  return json({ ok: true, rank: rank || null, scores: trimmed.slice(0, 50) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/scores") {
      if (request.method === "GET") return handleGet(env);
      if (request.method === "POST") return handlePost(request, env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
      return json({ ok: false, error: "허용되지 않은 메서드예요." }, 405);
    }

    // 그 외 모든 요청은 정적 자산(public/)으로
    const res = await env.ASSETS.fetch(request);

    // HTML과 데이터(json)는 항상 최신 확인(no-cache)하도록 헤더 덮어쓰기.
    //   → 모바일/인앱 브라우저가 옛 캐시를 붙잡고 있어도 접속 시 최신인지 재검증.
    //   (이미지 등 정적 파일은 기존 캐시 그대로 둬서 빠르게 로드)
    const path = url.pathname;
    if (path === "/" || path.endsWith(".html") || path.endsWith(".json")) {
      const fresh = new Response(res.body, res);
      fresh.headers.set("Cache-Control", "no-cache, must-revalidate");
      return fresh;
    }
    return res;
  },
};
