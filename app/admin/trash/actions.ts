"use server";

import { auth } from "@/auth";
import { restorePlan, permanentlyDeletePlan } from "@/lib/plans";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("管理者アカウントでログインしてください");
}

export async function restoreDeletedPlan(planId: string) {
  await requireAdmin();
  await restorePlan(planId);
}

/** 取り消せない完全削除。ゴミ箱からの最終処分専用 */
export async function permanentlyDeletePlanAction(planId: string) {
  await requireAdmin();
  await permanentlyDeletePlan(planId);
}
