import { db } from "@/db";
import { planFavorites, plans } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

/** 現在の識別子(匿名Cookie or ログインuserId)がお気に入り登録している企画のslug一覧 */
export async function getFavoriteSlugs(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .select({ slug: plans.slug })
    .from(planFavorites)
    .innerJoin(plans, eq(planFavorites.planId, plans.id))
    .where(eq(planFavorites.userId, userId));
  return rows.map((r) => r.slug);
}

/** マイページ用: お気に入り企画をカード表示に必要な列だけ取得（新しく追加した順） */
export async function getFavoritePlans(userId: string | null) {
  if (!userId) return [];
  const rows = await db
    .select({
      slug: plans.slug,
      title: plans.title,
      description: plans.description,
      type: plans.type,
      favoritedAt: planFavorites.createdAt,
    })
    .from(planFavorites)
    .innerJoin(plans, eq(planFavorites.planId, plans.id))
    .where(and(eq(planFavorites.userId, userId), eq(plans.isPublished, true)))
    .orderBy(desc(planFavorites.createdAt));
  return rows;
}

export async function isFavorited(planId: string, userId: string) {
  const rows = await db
    .select({ id: planFavorites.id })
    .from(planFavorites)
    .where(and(eq(planFavorites.planId, planId), eq(planFavorites.userId, userId)));
  return rows.length > 0;
}

/** トグルして、トグル後の状態(true=お気に入り済み)を返す */
export async function toggleFavorite(planId: string, userId: string): Promise<boolean> {
  const existing = await db
    .select({ id: planFavorites.id })
    .from(planFavorites)
    .where(and(eq(planFavorites.planId, planId), eq(planFavorites.userId, userId)));

  if (existing.length > 0) {
    await db.delete(planFavorites).where(eq(planFavorites.id, existing[0].id));
    return false;
  }

  await db.insert(planFavorites).values({ planId, userId }).onConflictDoNothing();
  return true;
}

/**
 * ログイン時、匿名Cookie IDに紐づくお気に入りを実ユーザーIDへ引き継ぐ。
 * 同じ企画を匿名時とログイン後の両方でお気に入り登録していた場合の重複は
 * ユニーク制約(plan_favorites_user_plan_unique)にonConflictDoNothingで任せ、
 * 残った匿名側の行は最後にまとめて削除する。
 */
export async function migrateFavorites(anonId: string, realUserId: string) {
  const anonRows = await db
    .select({ planId: planFavorites.planId })
    .from(planFavorites)
    .where(eq(planFavorites.userId, anonId));

  if (anonRows.length === 0) return;

  await db
    .insert(planFavorites)
    .values(anonRows.map((r) => ({ planId: r.planId, userId: realUserId })))
    .onConflictDoNothing();

  await db.delete(planFavorites).where(
    and(
      eq(planFavorites.userId, anonId),
      inArray(
        planFavorites.planId,
        anonRows.map((r) => r.planId)
      )
    )
  );
}
