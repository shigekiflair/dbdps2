import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq, asc, desc, and, isNull, isNotNull } from "drizzle-orm";
import { generateUniqueSlug } from "@/lib/slug";
import { canViewPlan, canHostPlan } from "@/lib/permissions";

export async function getPublishedPlans() {
  // 運営キュレーション企画のみ（createdByがnull）。ユーザー作成企画はここには出さず、
  // mypageの「自分の企画」やPhase2で作る「みんなの企画」経由でのみ辿れるようにする
  return db
    .select()
    .from(plans)
    .where(and(eq(plans.isPublished, true), isNull(plans.createdBy), isNull(plans.deletedAt)))
    .orderBy(asc(plans.sortOrder));
}

export async function getPlanBySlug(slug: string) {
  const rows = await db.select().from(plans).where(and(eq(plans.slug, slug), isNull(plans.deletedAt)));
  return rows[0] ?? null;
}

export async function getPlanById(planId: string) {
  const rows = await db.select().from(plans).where(eq(plans.id, planId));
  return rows[0] ?? null;
}

/**
 * 閲覧権限を考慮したうえで企画を取得する。
 * - 運営キュレーション企画(createdBy=null): 常に閲覧可
 * - private: 作成者本人のみ
 * - unlisted / public: 誰でも閲覧可（Phase1ではpublicも一覧掲載はしないが閲覧自体は可）
 * - 削除済み(deletedAtあり): 誰からも見えない(getPlanBySlugの時点で除外済み)
 */
export async function getViewablePlanBySlug(slug: string, viewerId: string | null) {
  const plan = await getPlanBySlug(slug);
  if (!plan) return null;
  if (!canViewPlan({ createdBy: plan.createdBy, visibility: plan.visibility }, viewerId)) return null;
  return plan;
}

export async function getUserPlans(userId: string) {
  return db
    .select()
    .from(plans)
    .where(and(eq(plans.createdBy, userId), isNull(plans.deletedAt)))
    .orderBy(desc(plans.createdAt));
}

type CreatePlanInput = {
  title: string;
  description: string;
  type: (typeof plans.$inferInsert)["type"];
  target: (typeof plans.$inferInsert)["target"];
  visibility: (typeof plans.$inferInsert)["visibility"];
  poolConfig?: unknown;
  createdBy: string;
};

export async function createUserPlan(input: CreatePlanInput) {
  const slug = await generateUniqueSlug(input.title);
  const rows = await db
    .insert(plans)
    .values({
      slug,
      title: input.title,
      description: input.description,
      type: input.type,
      target: input.target,
      visibility: input.visibility,
      poolConfig: input.poolConfig as any,
      createdBy: input.createdBy,
      isPublished: true, // ユーザー作成企画は作成時点で「公開」扱い(=visibilityで閲覧範囲を制御)
    })
    .returning();
  return rows[0];
}

export async function updateUserPlan(
  planId: string,
  actingUser: { id: string; isAdmin: boolean },
  input: Partial<Pick<CreatePlanInput, "title" | "description" | "visibility" | "poolConfig">>
) {
  const rows = await db.select().from(plans).where(eq(plans.id, planId));
  const existing = rows[0];
  if (!existing || !canHostPlan({ userId: actingUser.id, isAdmin: actingUser.isAdmin }, existing.createdBy)) {
    throw new Error("この企画を編集する権限がありません");
  }
  await db
    .update(plans)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.poolConfig !== undefined ? { poolConfig: input.poolConfig as any } : {}),
      updatedAt: new Date(),
    })
    .where(eq(plans.id, planId));
}

/**
 * ソフトデリート。物理削除はせず、deletedAtを立てて一覧・詳細から除外するだけにする。
 * 誤操作時にrestorePlanで復元できるようにするため。
 */
export async function deleteUserPlan(planId: string, actingUser: { id: string; isAdmin: boolean }) {
  const rows = await db.select().from(plans).where(eq(plans.id, planId));
  const existing = rows[0];
  if (!existing || !canHostPlan({ userId: actingUser.id, isAdmin: actingUser.isAdmin }, existing.createdBy)) {
    throw new Error("この企画を削除する権限がありません");
  }
  await db.update(plans).set({ deletedAt: new Date() }).where(eq(plans.id, planId));
}

/** 管理者用: ソフトデリート済みの企画一覧（復元・完全削除の対象） */
export async function getDeletedPlans() {
  return db.select().from(plans).where(isNotNull(plans.deletedAt)).orderBy(desc(plans.deletedAt));
}

export async function restorePlan(planId: string) {
  await db.update(plans).set({ deletedAt: null }).where(eq(plans.id, planId));
}

/** 完全削除（ゴミ箱からの最終削除専用。取り消せない） */
export async function permanentlyDeletePlan(planId: string) {
  await db.delete(plans).where(eq(plans.id, planId));
}
