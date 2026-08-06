"use server";

import { auth } from "@/auth";
import { deleteUserPlan } from "@/lib/plans";

export async function deleteMyPlan(planId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です" };

  try {
    await deleteUserPlan(planId, { id: session.user.id, isAdmin: !!session.user.isAdmin });
    return {};
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "削除に失敗しました。" };
  }
}
