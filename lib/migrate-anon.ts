"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { planProgress, planResults } from "@/db/schema";
import { auth } from "@/auth";
import { ANON_COOKIE } from "@/lib/anon-user";

/**
 * ログイン直後に呼ぶ想定。
 * 匿名Cookie(tf_anon_id)に紐づく plan_progress / plan_results の
 * userId を、ログイン済みユーザーのidへ書き換える。
 * 既にCookieが無い(初回ログインより前に何も操作していない)場合は何もしない。
 */
export async function migrateAnonProgress() {
  const session = await auth();
  if (!session?.user?.id) return;

  const store = await cookies();
  const anonId = store.get(ANON_COOKIE)?.value;
  if (!anonId) return;

  await db.update(planProgress).set({ userId: session.user.id }).where(eq(planProgress.userId, anonId));
  await db.update(planResults).set({ userId: session.user.id }).where(eq(planResults.userId, anonId));

  store.delete(ANON_COOKIE);
}
