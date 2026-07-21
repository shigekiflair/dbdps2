import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../db/index";
import { characters, perks, tags, taggables, items, addons, rarityEnum } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * 実行方法:
 *   npm install csv-parse
 *   npx tsx scripts/import-csv.ts
 *
 * data/characters.csv → characters テーブル
 * data/tags.csv       → tags テーブル
 * data/perks.csv      → perks テーブル + taggables(perk⇔tag紐付け)
 * data/items.csv      → items テーブル（アイテムカテゴリ：医療キット等5種）
 * data/addons.csv     → addons テーブル（killer_slugかitem_slugのどちらか一方を指定）
 *
 * CSVを差し替えれば、キラー/サバイバーやパークが増えるたびに
 * このスクリプトを再実行するだけでDBが最新化される想定。
 */

const VALID_RARITIES = new Set(rarityEnum.enumValues);

function readCsv(path: string) {
  const raw = readFileSync(path, "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

async function importCharacters() {
  const rows = readCsv("data/characters.csv");
  for (const row of rows) {
    await db
      .insert(characters)
      .values({
        slug: row.slug,
        name: row.name,
        role: row.role as "killer" | "survivor",
        chapter: row.chapter || null,
        iconUrl: row.icon_url || null,
      })
      .onConflictDoUpdate({
        target: characters.slug,
        set: {
          name: row.name,
          role: row.role as "killer" | "survivor",
          chapter: row.chapter || null,
          iconUrl: row.icon_url || null,
        },
      });
  }
  console.log(`characters: ${rows.length}件 処理`);
}

async function importTags() {
  const rows = readCsv("data/tags.csv");
  for (const row of rows) {
    await db
      .insert(tags)
      .values({ slug: row.slug, label: row.label, color: row.color || null })
      .onConflictDoNothing();
  }
  console.log(`tags: ${rows.length}件 処理`);
}

async function importPerks() {
  const rows = readCsv("data/perks.csv");

  // slug → id の解決用マップを先に作る
  const allCharacters = await db.select().from(characters);
  const charBySlug = new Map(allCharacters.map((c) => [c.slug, c.id]));

  const allTags = await db.select().from(tags);
  const tagBySlug = new Map(allTags.map((t) => [t.slug, t.id]));

  for (const row of rows) {
    const originCharacterId = row.origin_character_slug
      ? charBySlug.get(row.origin_character_slug)
      : undefined;

    const [inserted] = await db
      .insert(perks)
      .values({
        slug: row.slug,
        name: row.name,
        description: row.description_summary || null,
        role: row.role as "killer" | "survivor",
        originCharacterId: originCharacterId ?? null,
        iconUrl: row.icon_url || null,
      })
      .onConflictDoUpdate({
        target: perks.slug,
        set: {
          name: row.name,
          description: row.description_summary || null,
          role: row.role as "killer" | "survivor",
          originCharacterId: originCharacterId ?? null,
          iconUrl: row.icon_url || null,
        },
      })
      .returning({ id: perks.id, slug: perks.slug });

    // onConflictDoUpdateなので基本的にinsertedは必ず入るが、念のためフォールバックも残す
    const perkId =
      inserted?.id ??
      (await db.select({ id: perks.id }).from(perks).where(eq(perks.slug, row.slug)))[0]?.id;

    if (!perkId) continue;

    const tagSlugs = (row.tags || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const tagSlug of tagSlugs) {
      const tagId = tagBySlug.get(tagSlug);
      if (!tagId) {
        console.warn(`未登録タグをスキップ: ${tagSlug}（先にtags.csvへ追加してください）`);
        continue;
      }
      await db
        .insert(taggables)
        .values({ tagId, taggableType: "perk", taggableId: perkId })
        .onConflictDoNothing();
    }
  }
  console.log(`perks: ${rows.length}件 処理`);
}

async function importItems() {
  const rows = readCsv("data/items.csv");

  for (const row of rows) {
    await db
      .insert(items)
      .values({
        slug: row.slug,
        name: row.name,
        iconUrl: row.icon_url || null,
      })
      .onConflictDoUpdate({
        target: items.slug,
        set: { name: row.name, iconUrl: row.icon_url || null },
      });
  }
  console.log(`items: ${rows.length}件 処理`);
}

async function importAddons() {
  const rows = readCsv("data/addons.csv");
  if (rows.length === 0) {
    console.log("addons: data/addons.csv が空のためスキップ");
    return;
  }

  // slug → id の解決用マップ
  const allCharacters = await db.select().from(characters);
  const charBySlug = new Map(allCharacters.map((c) => [c.slug, c.id]));

  const allItems = await db.select().from(items);
  const itemBySlug = new Map(allItems.map((i) => [i.slug, i.id]));

  let skipped = 0;

  for (const row of rows) {
    const killerSlug = (row.killer_slug || "").trim();
    const itemSlug = (row.item_slug || "").trim();

    // killer_slug と item_slug はどちらか一方だけが入っている想定。
    // 両方空 / 両方あり / 未登録slug はデータ不備としてスキップする。
    if ((killerSlug && itemSlug) || (!killerSlug && !itemSlug)) {
      console.warn(
        `不正な行をスキップ: ${row.slug}（killer_slugとitem_slugはどちらか一方のみ指定してください）`
      );
      skipped++;
      continue;
    }

    if (!VALID_RARITIES.has(row.rarity as (typeof rarityEnum.enumValues)[number])) {
      console.warn(`不正なrarityをスキップ: ${row.slug}（値: ${row.rarity}）`);
      skipped++;
      continue;
    }

    let killerId: string | null = null;
    let itemId: string | null = null;

    if (killerSlug) {
      killerId = charBySlug.get(killerSlug) ?? null;
      if (!killerId) {
        console.warn(`未登録killer_slugをスキップ: ${row.slug}（値: ${killerSlug}）`);
        skipped++;
        continue;
      }
    } else {
      itemId = itemBySlug.get(itemSlug) ?? null;
      if (!itemId) {
        console.warn(`未登録item_slugをスキップ: ${row.slug}（値: ${itemSlug}）`);
        skipped++;
        continue;
      }
    }

    await db
      .insert(addons)
      .values({
        slug: row.slug,
        name: row.name,
        description: row.description_summary || null,
        rarity: row.rarity as (typeof rarityEnum.enumValues)[number],
        killerId,
        itemId,
        iconUrl: row.icon_url || null,
      })
      .onConflictDoUpdate({
        target: addons.slug,
        set: {
          name: row.name,
          description: row.description_summary || null,
          rarity: row.rarity as (typeof rarityEnum.enumValues)[number],
          killerId,
          itemId,
          iconUrl: row.icon_url || null,
        },
      });
  }
  console.log(`addons: ${rows.length}件中 ${rows.length - skipped}件 処理（${skipped}件スキップ）`);
}

async function main() {
  await importCharacters();
  await importTags();
  await importPerks();
  await importItems();
  await importAddons();
  console.log("インポート完了");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
