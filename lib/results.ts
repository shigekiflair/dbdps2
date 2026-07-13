import { db } from "@/db";
import { planResults } from "@/db/schema";
import { eq } from "drizzle-orm";

const CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"; // l,1,0,o等の紛らわしい文字は除外

function generateShareCode(length = 8) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function saveResult(planId: string, resultPayload: unknown) {
  const shareCode = generateShareCode();
  await db.insert(planResults).values({
    planId,
    shareCode,
    resultPayload: resultPayload as any,
  });
  return shareCode;
}

export async function getResultByCode(shareCode: string) {
  const rows = await db.select().from(planResults).where(eq(planResults.shareCode, shareCode));
  return rows[0] ?? null;
}
