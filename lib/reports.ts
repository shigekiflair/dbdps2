import { db } from "@/db";
import { planReports, plans, users } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";

const GLOBAL_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1時間
const GLOBAL_LIMIT_COUNT = 5; // 1時間あたり最大5件まで(どの企画に対してでも合計)

/**
 * 通報を作成する。連投防止のため2段階でチェックする。
 * 1) 同じ人が同じ企画をすでに(未対応で)通報済みなら弾く
 * 2) 直近1時間で既に一定件数以上通報していたら弾く(色々な企画に対する連投荒らし対策)
 */
export async function createReport(planId: string, reporterId: string | null, reason: string) {
  if (!reporterId) {
    throw new Error("通報にはCookieの識別情報が必要です。ページを再読み込みしてお試しください。");
  }

  const existing = await db
    .select({ id: planReports.id })
    .from(planReports)
    .where(and(eq(planReports.planId, planId), eq(planReports.reporterId, reporterId), eq(planReports.resolved, false)));
  if (existing.length > 0) {
    throw new Error("この企画は既に通報済みです。管理者が確認するまでお待ちください。");
  }

  const since = new Date(Date.now() - GLOBAL_LIMIT_WINDOW_MS);
  const recent = await db
    .select({ id: planReports.id })
    .from(planReports)
    .where(and(eq(planReports.reporterId, reporterId), gt(planReports.createdAt, since)));
  if (recent.length >= GLOBAL_LIMIT_COUNT) {
    throw new Error("短時間に通報が続いたため、一時的に制限しています。しばらく経ってからお試しください。");
  }

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
