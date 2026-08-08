import { db } from "@/db";
import { tags, taggables } from "@/db/schema";
import { asc, and, eq, inArray } from "drizzle-orm";

type TagCategory = "perk_attribute" | "plan_genre";

/**
 * category未指定の場合は全件返す(既存呼び出し箇所との後方互換のため)。
 * パーク絞り込み用のタグ選択UIなど、片方のカテゴリだけを出したい場合はcategoryを渡すこと。
 */
export async function getAllTags(category?: TagCategory) {
  if (category) {
    return db.select().from(tags).where(eq(tags.category, category)).orderBy(asc(tags.label));
  }
  return db.select().from(tags).orderBy(asc(tags.label));
}

/** 指定した企画に紐づくジャンルタグを取得する */
export async function getPlanGenreTags(planId: string) {
  return db
    .select({ id: tags.id, slug: tags.slug, label: tags.label, color: tags.color })
    .from(taggables)
    .innerJoin(tags, eq(tags.id, taggables.tagId))
    .where(and(eq(taggables.taggableType, "plan"), eq(taggables.taggableId, planId)));
}

/**
 * 複数企画分のジャンルタグを一括取得する(企画一覧ページ用)。
 * 企画ごとにクエリを発行すると一覧の件数分N+1になるため、まとめて取得してMapに詰め替える。
 */
export async function getGenreTagsForPlans(planIds: string[]) {
  const map = new Map<string, { id: string; slug: string; label: string; color: string | null }[]>();
  if (planIds.length === 0) return map;

  const rows = await db
    .select({
      planId: taggables.taggableId,
      id: tags.id,
      slug: tags.slug,
      label: tags.label,
      color: tags.color,
    })
    .from(taggables)
    .innerJoin(tags, eq(tags.id, taggables.tagId))
    .where(and(eq(taggables.taggableType, "plan"), inArray(taggables.taggableId, planIds)));

  for (const row of rows) {
    const list = map.get(row.planId) ?? [];
    list.push({ id: row.id, slug: row.slug, label: row.label, color: row.color });
    map.set(row.planId, list);
  }
  return map;
}

/** 企画のジャンルタグを丸ごと置き換える(既存の紐付けを削除してから指定分を挿入し直す) */
export async function setPlanGenreTags(planId: string, tagIds: string[]) {
  await db.delete(taggables).where(and(eq(taggables.taggableType, "plan"), eq(taggables.taggableId, planId)));
  if (tagIds.length === 0) return;
  await db.insert(taggables).values(tagIds.map((tagId) => ({ tagId, taggableType: "plan", taggableId: planId })));
}
