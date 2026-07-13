import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[drizzle.config.ts] DATABASE_URLが読み込めませんでした。プロジェクトルートに.env.localを作成し、" +
      "DATABASE_URL=postgresql://... を設定してください（.env.exampleを参照）。"
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
