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
