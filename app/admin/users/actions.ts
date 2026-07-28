"use server";

import { auth } from "@/auth";
import { setAdminStatus } from "@/lib/users";
import { canChangeAdminStatus } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("管理者アカウントでログインしてください");
  return session;
}

export async function toggleAdmin(targetUserId: string, nextIsAdmin: boolean) {
  const session = await requireAdmin();

  if (!canChangeAdminStatus(targetUserId, nextIsAdmin, session.user.id)) {
    throw new Error("自分自身の管理者権限は、このUIからは外せません。");
  }

  await setAdminStatus(targetUserId, nextIsAdmin);
}
