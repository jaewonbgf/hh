// 추천 API 검증용 클라이언트 (콘솔 깨짐 방지를 위해 결과를 파일로 저장)
const http = require("http");
const fs = require("fs");

function reco(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: "localhost", port: 3000, path: "/api/recommend", method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(JSON.parse(b))); }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const CASES = {
  "해나 본인(who=hana)": { who:"hana", gender:"여아", type:"산리오", mood:"귀여운", color:"분홍색", activity:"마법", animal:"토끼", personality:"다정한" },
  "해성 본인(who=haesung)": { who:"haesung", gender:"남아", type:"게임", mood:"강한", color:"초록색", activity:"배틀", animal:"공룡", personality:"용감한" },
  "친구(who=friend)": { who:"friend", gender:"여아", type:"프린세스", mood:"멋진", color:"파랑", activity:"마법", animal:"새", personality:"용감한" },
};

(async () => {
  const out = [];
  for (const [label, body] of Object.entries(CASES)) {
    const r = await reco(body);
    out.push(`■ ${label}`);
    out.push(`  1위: ${r.top.name} [${r.top.sub_category}/${r.top.target_age}] score=${r.top.score} parts=${JSON.stringify(r.top.score_parts)}`);
    out.push(`  함께: ${r.runners.map((x) => `${x.name}[${x.sub_category}]`).join("  /  ")}`);
    out.push("");
  }
  fs.writeFileSync("_verify.txt", out.join("\n"), "utf-8");
  console.log("검증 완료 → _verify.txt");
})();
