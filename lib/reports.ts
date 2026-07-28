import { db } from "@/db";
import { planReports, plans, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function createReport(planId: string, reporterId: string | null, reason: string) {
  await db.insert(planReports).values({ planId, reporterId, reason: reason.trim().slice(0, 500) });
}

/** 未対応の通報一覧（管理者用）。企画情報・作成者名も一緒に返す */
export async function getOpenReports() {
  return db
    .select({
      id: planReports.id,
      reason: planReports.reason,
      createdAt: planReports.createdAt,
      planId: plans.id,
      planSlug: plans.slug,
      planTitle: plans.title,
      creatorName: users.name,
    })
    .from(planReports)
    .innerJoin(plans, eq(planReports.planId, plans.id))
    .leftJoin(users, eq(plans.createdBy, users.id))
    .where(eq(planReports.resolved, false))
    .orderBy(desc(planReports.createdAt));
}

export async function resolveReport(reportId: string) {
  await db.update(planReports).set({ resolved: true }).where(eq(planReports.id, reportId));
}
