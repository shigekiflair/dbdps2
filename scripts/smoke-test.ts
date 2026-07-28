/**
 * デプロイ後に主要ページ/APIが200を返すか確認する簡易スモークテスト。
 * 使い方: npm run smoke -- https://dbdps2.vercel.app
 * (引数を省略した場合は SMOKE_BASE_URL 環境変数、それも無ければ本番URLを既定値にする)
 *
 * 過去に「マイグレーションもデプロイも成功しているのに、AUTH_SECRET未設定でログインだけ全滅していた」
 * という事故があったため、これを検知できるようauth関連のエンドポイントも含めている。
 */

const DEFAULT_BASE_URL = "https://dbdps2.vercel.app";

const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

type Check = { path: string; label: string; expect: number[] };

const checks: Check[] = [
  { path: "/plans", label: "企画一覧ページ", expect: [200] },
  { path: "/mypage", label: "マイページ", expect: [200] },
  { path: "/ranking", label: "ランキングページ", expect: [200] },
  // 認証系: ここが500だと、過去に起きたAUTH_SECRET未設定/OAuth設定ミスと同種の事故
  { path: "/api/auth/providers", label: "認証プロバイダ一覧(DB不要)", expect: [200] },
  { path: "/api/auth/session", label: "セッション確認API", expect: [200] },
];

async function run() {
  console.log(`smoke test against: ${baseUrl}\n`);
  let hasFailure = false;

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      const ok = check.expect.includes(res.status);
      const mark = ok ? "OK  " : "FAIL";
      console.log(`[${mark}] ${check.label.padEnd(20, "\u3000")} ${res.status}  ${url}`);
      if (!ok) hasFailure = true;
    } catch (err) {
      hasFailure = true;
      console.log(`[FAIL] ${check.label.padEnd(20, "\u3000")} (fetch error) ${url}`);
      console.log(`       ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("");
  if (hasFailure) {
    console.error("スモークテスト失敗。上記のFAILを確認してください。");
    process.exit(1);
  } else {
    console.log("スモークテスト成功。");
  }
}

run();
