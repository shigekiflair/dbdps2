"use server";

import { getPlanBySlug } from "@/lib/plans";
import { ensureCurrentIdentityId } from "@/lib/identity";
import { createReport } from "@/lib/reports";

/** Server Actionは本番だとthrowしたエラーメッセージが握りつぶされるため、戻り値で返す */
export async function reportPlan(slug: string, reason: string): Promise<{ error?: string }> {
  if (!reason.trim()) return { error: "通報理由を入力してください" };

  const plan = await getPlanBySlug(slug);
  if (!plan) return { error: "企画が見つかりません" };

  try {
    const identityId = await ensureCurrentIdentityId();
    await createReport(plan.id, identityId, reason);
    return {};
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "通報に失敗しました。" };
  }
}
