import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Vercel Postgres(Neon)の接続文字列を.envに設定してください。");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
