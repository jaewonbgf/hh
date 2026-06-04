# 🎀 캐릭터 찾기 챗봇 — 무료 웹 배포 가이드 (Cloudflare Pages)

이 앱은 **서버 없이 100% 정적 사이트로 동작**하도록 변환되었습니다.
추천 로직이 브라우저에서 돌기 때문에 무료로 영구 호스팅할 수 있어요 (콜드스타트 없음).

배포할 폴더는 **`public/`** 입니다. (이 안에 `index.html`, `characters.json`, `images/`, `img/` 가 모두 들어있음)

---

## 방법 A. GitHub + Cloudflare Pages 연동 (추천 — 수정 후 자동 반영)

### 1단계. GitHub에 저장소 만들기
1. https://github.com/new 에서 새 저장소 생성 (예: `character-finder`). **Private/Public 아무거나 OK.**
2. 저장소를 만들고 나오는 주소를 복사 (예: `https://github.com/내아이디/character-finder.git`)

### 2단계. 코드 올리기 (터미널에서)
이 프로젝트 폴더(`C:\claude\hh`)에서 아래를 실행하세요.
git 초기 커밋은 이미 만들어져 있으니 원격만 연결해서 push하면 됩니다.

```powershell
git remote add origin https://github.com/내아이디/character-finder.git
git branch -M main
git push -u origin main
```

> 처음 push할 때 GitHub 로그인(브라우저 인증)이 뜰 수 있어요. 안내대로 로그인하면 됩니다.

### 3단계. Cloudflare Pages 연결
1. https://dash.cloudflare.com 가입/로그인 (무료)
2. 왼쪽 메뉴 **Workers & Pages → Create → Pages → Connect to Git**
3. 방금 만든 GitHub 저장소 선택
4. 빌드 설정을 아래처럼 입력:
   - **Framework preset**: `None`
   - **Build command**: (비워둠)
   - **Build output directory**: `public`
5. **Save and Deploy** 클릭 → 1~2분 뒤 `https://character-finder.pages.dev` 같은 주소가 생깁니다 🎉

이후엔 코드를 고치고 `git push` 하면 **자동으로 다시 배포**됩니다.

---

## 방법 B. 드래그&드롭 (GitHub 없이 가장 빠름)

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Upload assets**
2. 프로젝트 이름 입력 후, **`public` 폴더 안의 파일들**을 드래그&드롭
   (⚠️ `public` 폴더 자체가 아니라 그 **안의 내용물** `index.html` 등을 올려야 해요)
3. **Deploy** → 주소 생성 완료

> 수정할 때마다 다시 업로드해야 하므로, 자주 고칠 거라면 방법 A를 추천합니다.

---

## 로컬에서 미리보기
정적 파일이라 아무 정적 서버로나 열어볼 수 있어요. 기존 Node 서버도 그대로 됩니다:

```powershell
npm install
npm start
# → http://localhost:3000
```

## 캐릭터/사진 수정하기
- 캐릭터 데이터: `public/characters.json` 수정
- 아이 사진: `public/img/hn.jpg`(이해나), `public/img/hs.jpg`(이해성) 교체
- 수정 후 방법 A는 `git push`, 방법 B는 재업로드

---

## 🏆 누적 랭킹(모험 게임 점수) 켜기 — Cloudflare KV 연결

추천 결과에서 **"🏃 이 캐릭터로 모험을 떠나볼래요?"** 를 누르면 20초 횡스크롤 게임이 시작되고,
끝나면 이름을 적어 **누적 랭킹**에 등록할 수 있어요. 이 랭킹을 **모두가 함께 보려면**
점수를 저장할 무료 저장소(**Cloudflare KV**) 하나만 연결하면 됩니다.

> KV를 연결하지 않아도 게임은 그대로 즐길 수 있어요. 다만 랭킹이 **"이 기기에만"** 저장되고
> (화면에 ⚠️ 안내가 떠요) 다른 사람과 공유되지 않습니다.

> ℹ️ 이 사이트는 **Cloudflare Workers(정적 자산)** 로 배포돼 있어요(`wrangler.jsonc`의 `wrangler deploy`).
> 그래서 랭킹 API는 `worker.js` 가 처리하고, KV는 **`wrangler.jsonc` 에 Namespace ID** 를 적어 연결합니다.
> (Pages가 아니므로 대시보드의 "KV namespace bindings" UI는 사용하지 않습니다.)

### 1) KV 네임스페이스 만들기 (한 번만)
- Cloudflare 대시보드 → **Storage & Databases → KV → Create namespace**
- 이름은 아무거나 (예: `leaderboard`) → **Add**
- 만들어진 네임스페이스의 **Namespace ID** 를 복사 (예: `a1b2c3d4...` 형태의 긴 문자열)

### 2) wrangler.jsonc 에 ID 붙여넣기
`wrangler.jsonc` 의 아래 부분에서 `<여기에-KV-namespace-id>` 를 복사한 ID로 교체:
```jsonc
"kv_namespaces": [
  { "binding": "LEADERBOARD", "id": "여기에_복사한_ID" }
]
```

### 3) 배포
- `git push` 하면 Workers Builds가 `wrangler deploy` 로 자동 배포하면서 KV가 연결됩니다.
- 또는 대시보드 → **Workers & Pages → hh → Deployments → 최근 빌드 Retry**.

이제 누가 접속하든 **같은 누적 랭킹**을 보게 됩니다. 🎉
(점수 API는 `worker.js` 의 `/api/scores` 가 처리하고, 나머지는 `public/` 정적 자산을 서빙합니다.)

### 로컬에서 게임/랭킹 테스트
`npm start` 로 띄우면 로컬에서는 `scores.local.json` 파일에 점수가 저장돼
랭킹 등록까지 그대로 테스트할 수 있어요(이 파일은 git에 올라가지 않음).
