"use server";

import { auth } from "@/auth";
import { setAdminStatus } from "@/lib/users";
import { canChangeAdminStatus } from "@/lib/permissions";

export async function toggleAdmin(targetUserId: string, nextIsAdmin: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "管理者アカウントでログインしてください" };

  if (!canChangeAdminStatus(targetUserId, nextIsAdmin, session.user.id)) {
    return { error: "自分自身の管理者権限は、このUIからは外せません。" };
  }

  try {
    await setAdminStatus(targetUserId, nextIsAdmin);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "操作に失敗しました。" };
  }
}
