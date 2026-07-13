import { db } from "@/db";
import { perks, taggables, tags, characters } from "@/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";

type PoolConfig = {
  source: "perk" | "killer" | "survivor" | "addon" | "offering" | "map" | "custom_text";
  filterTags?: string[];
  excludeTags?: string[];
  count?: number | null;
  weighting?: "equal" | "fixed_slot" | "custom";
  customPool?: string[];
};

type DrawOptions = {
  role?: "survivor" | "killer";
  excludeIds?: string[]; // 固定中(ロック中)のカードは再抽選対象から除外する
};

export async function drawFromPool(pool: PoolConfig, opts: DrawOptions = {}) {
  if (pool.source === "custom_text") {
    const items = (pool.customPool ?? []).filter((_, i) => !opts.excludeIds?.includes(String(i)));
    return shuffle(items).slice(0, pool.count ?? items.length);
  }

  if (pool.source === "killer" || pool.source === "survivor") {
    const whereClauses = [eq(characters.role, pool.source)];
    if (opts.excludeIds?.length) whereClauses.push(notInArray(characters.id, opts.excludeIds));
    const rows = await db.select().from(characters).where(and(...whereClauses));
    return shuffle(rows).slice(0, pool.count ?? 1);
  }

  if (pool.source !== "perk") {
    // addon / offering / map の抽選は同じ形で今後追加する
    throw new Error(`未対応のpool.source: ${pool.source}`);
  }

  let candidateIds: string[] | null = null;
  if (pool.filterTags?.length) {
    const rows = await db
      .select({ perkId: taggables.taggableId })
      .from(taggables)
      .innerJoin(tags, eq(tags.id, taggables.tagId))
      .where(and(eq(taggables.taggableType, "perk"), inArray(tags.slug, pool.filterTags)));
    candidateIds = rows.map((r) => r.perkId);
  }

  const whereClauses = [eq(perks.isActive, true)];
  if (opts.role) whereClauses.push(eq(perks.role, opts.role));
  if (candidateIds) whereClauses.push(inArray(perks.id, candidateIds));
  if (opts.excludeIds?.length) whereClauses.push(notInArray(perks.id, opts.excludeIds));

  const rows = await db.select().from(perks).where(and(...whereClauses));
  return shuffle(rows).slice(0, pool.count ?? 4);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
