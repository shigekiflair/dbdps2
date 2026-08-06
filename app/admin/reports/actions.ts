"use server";

import { auth } from "@/auth";
import { resolveReport as resolveReportDb } from "@/lib/reports";
import { deleteUserPlan } from "@/lib/plans";

async function requireAdmin(): Promise<{ error: string } | { id: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) return { error: "管理者アカウントでログインしてください" };
  return { id: session.user.id };
}

export async function dismissReport(reportId: string): Promise<{ error?: string }> {
  const check = await requireAdmin();
  if ("error" in check) return check;
  try {
    await resolveReportDb(reportId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "却下に失敗しました。" };
  }
}

/**
 * 通報された企画をソフトデリートし、通報自体も解決済みにする。
 * deleteUserPlanが管理者オーバーライドに対応しているため、createdByの有無(運営キュレーション企画かどうか)に
 * 関わらずそのまま呼び出せる。物理削除ではないので、誤操作時は/admin/trashから復元できる。
 */
export async function deleteReportedPlan(reportId: string, planId: string): Promise<{ error?: string }> {
  const check = await requireAdmin();
  if ("error" in check) return check;

  try {
    await deleteUserPlan(planId, { id: check.id, isAdmin: true });
    await resolveReportDb(reportId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "削除に失敗しました。" };
  }
}
