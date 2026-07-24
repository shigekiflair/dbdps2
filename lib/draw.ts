import { db } from "@/db";
import { perks, taggables, tags, characters, addons as addonsTable, items as itemsTable } from "@/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";

type PoolConfig = {
  source: "perk" | "killer" | "survivor" | "addon" | "item" | "offering" | "map" | "custom_text";
  filterTags?: string[];
  excludeTags?: string[];
  count?: number | null;
  weighting?: "equal" | "fixed_slot" | "custom";
  customPool?: string[];
};

type DrawOptions = {
  role?: "survivor" | "killer";
  excludeIds?: string[]; // 固定中(ロック中)のカードは再抽選対象から除外する
  killerId?: string; // pool.source: "addon" でキラー固有アドオンに絞り込む場合に指定
  itemId?: string; // pool.source: "addon" でアイテム(医療キット等)アドオンに絞り込む場合に指定
};

// pool.source ごとに戻り値の型を絞り込むためのオーバーロード。
// これが無いと呼び出し側で「string | オブジェクト」の合併型になり、
// character?.id のようなプロパティアクセスで型エラーになる。
export function drawFromPool(
  pool: PoolConfig & { source: "custom_text" },
  opts?: DrawOptions
): Promise<string[]>;
export function drawFromPool(
  pool: PoolConfig & { source: "killer" | "survivor" },
  opts?: DrawOptions
): Promise<(typeof characters.$inferSelect)[]>;
export function drawFromPool(
  pool: PoolConfig & { source: "item" },
  opts?: DrawOptions
): Promise<(typeof itemsTable.$inferSelect)[]>;
export function drawFromPool(
  pool: PoolConfig & { source: "addon" },
  opts?: DrawOptions
): Promise<(typeof addonsTable.$inferSelect)[]>;
export function drawFromPool(
  pool: PoolConfig & { source: "perk" },
  opts?: DrawOptions
): Promise<(typeof perks.$inferSelect)[]>;
export function drawFromPool(pool: PoolConfig, opts?: DrawOptions): Promise<unknown[]>;
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

  if (pool.source === "item") {
    const whereClauses = [];
    if (opts.excludeIds?.length) whereClauses.push(notInArray(itemsTable.id, opts.excludeIds));
    const rows = whereClauses.length
      ? await db.select().from(itemsTable).where(and(...whereClauses))
      : await db.select().from(itemsTable);
    return shuffle(rows).slice(0, pool.count ?? 1);
  }

  if (pool.source === "addon") {
    if (!opts.killerId && !opts.itemId) {
      // どのキラー/アイテムのアドオンか未確定な状態では抽選できない
      // (呼び出し側でキャラクター決定後に killerId/itemId を渡すこと)
      return [];
    }
    const whereClauses = [];
    if (opts.killerId) whereClauses.push(eq(addonsTable.killerId, opts.killerId));
    if (opts.itemId) whereClauses.push(eq(addonsTable.itemId, opts.itemId));
    if (opts.excludeIds?.length) whereClauses.push(notInArray(addonsTable.id, opts.excludeIds));

    const rows = await db.select().from(addonsTable).where(and(...whereClauses));
    return shuffle(rows).slice(0, pool.count ?? 2);
  }

  if (pool.source !== "perk") {
    // offering / map の抽選は同じ形で今後追加する
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
