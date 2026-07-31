"use server";

import { auth } from "@/auth";
import { deleteUserPlan } from "@/lib/plans";

export async function deleteMyPlan(planId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です" };

  try {
    await deleteUserPlan(planId, session.user.id);
    return {};
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "削除に失敗しました。" };
  }
}
