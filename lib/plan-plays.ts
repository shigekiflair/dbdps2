import { db } from "@/db";
import { planPlayDaily } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * 「実際に引く/実行する」操作の日次プレイ数を+1する。
 * ランキング表示のための集計用なので、記録に失敗しても抽選そのものは失敗させない
 * （呼び出し側で await するが、例外は投げずログのみ）。
 */
export async function recordPlanPlay(planId: string) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"（UTC基準）
  try {
    await db
      .insert(planPlayDaily)
      .values({ planId, playDate: today, playCount: 1 })
      .onConflictDoUpdate({
        target: [planPlayDaily.planId, planPlayDaily.playDate],
        set: { playCount: sql`${planPlayDaily.playCount} + 1` },
      });
  } catch (err) {
    console.error("recordPlanPlay failed", err);
  }
}
