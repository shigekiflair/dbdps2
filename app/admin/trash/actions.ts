"use server";

import { auth } from "@/auth";
import { restorePlan, permanentlyDeletePlan } from "@/lib/plans";

async function requireAdmin(): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "管理者アカウントでログインしてください" };
  return { ok: true };
}

export async function restoreDeletedPlan(planId: string): Promise<{ error?: string }> {
  const check = await requireAdmin();
  if ("error" in check) return check;
  try {
    await restorePlan(planId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "復元に失敗しました。" };
  }
}

/** 取り消せない完全削除。ゴミ箱からの最終処分専用 */
export async function permanentlyDeletePlanAction(planId: string): Promise<{ error?: string }> {
  const check = await requireAdmin();
  if ("error" in check) return check;
  try {
    await permanentlyDeletePlan(planId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "完全削除に失敗しました。" };
  }
}
