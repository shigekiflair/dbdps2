import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../db/index";
import { characters, perks, tags, taggables } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * 実行方法:
 *   npm install csv-parse
 *   npx tsx scripts/import-csv.ts
 *
 * data/characters.csv → characters テーブル
 * data/tags.csv       → tags テーブル
 * data/perks.csv      → perks テーブル + taggables(perk⇔tag紐付け)
 *
 * CSVを差し替えれば、キラー/サバイバーやパークが増えるたびに
 * このスクリプトを再実行するだけでDBが最新化される想定。
 */

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
      .onConflictDoNothing();
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
      .onConflictDoNothing()
      .returning({ id: perks.id, slug: perks.slug });

    // onConflictDoNothingで既存行がスキップされた場合はinsertedが空になるため
    // 既存perkのidを取得し直してからタグを紐付ける
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

async function main() {
  await importCharacters();
  await importTags();
  await importPerks();
  console.log("インポート完了");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
