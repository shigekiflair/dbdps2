"use server";

import { auth } from "@/auth";
import { deleteUserPlan } from "@/lib/plans";

export async function deleteMyPlan(planId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("ログインが必要です");
  await deleteUserPlan(planId, session.user.id);
}
