"use server";

import { auth } from "@/auth";
import { resolveReport as resolveReportDb } from "@/lib/reports";
import { deleteUserPlan } from "@/lib/plans";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin(): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "管理者アカウントでログインしてください" };
  return { ok: true };
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
 * 通報された企画をソフトデリートし、通報自体も解決済みにする（管理者はcreatedByに関わらず削除できる）。
 * 物理削除ではないので、誤操作時は/admin/trashから復元できる。
 */
export async function deleteReportedPlan(reportId: string, planId: string): Promise<{ error?: string }> {
  const check = await requireAdmin();
  if ("error" in check) return check;

  try {
    const rows = await db.select({ createdBy: plans.createdBy }).from(plans).where(eq(plans.id, planId));
    const createdBy = rows[0]?.createdBy;
    if (createdBy) {
      await deleteUserPlan(planId, createdBy);
    } else {
      await db.update(plans).set({ deletedAt: new Date() }).where(eq(plans.id, planId));
    }
    await resolveReportDb(reportId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "削除に失敗しました。" };
  }
}
