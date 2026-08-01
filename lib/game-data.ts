import { db } from "@/db";
import { characters, perks, addons, maps, items } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/* ========== キャラクター（キラー/サバイバー） ========== */

export async function getAllCharactersAdmin() {
  return db.select().from(characters).orderBy(asc(characters.role), asc(characters.name));
}

export async function isCharacterSlugTaken(slug: string, excludeId?: string) {
  const rows = await db.select({ id: characters.id }).from(characters).where(eq(characters.slug, slug));
  return rows.some((r) => r.id !== excludeId);
}

export async function createCharacter(input: {
  slug: string;
  name: string;
  role: "killer" | "survivor";
  chapter?: string | null;
  iconUrl?: string | null;
}) {
  const rows = await db.insert(characters).values(input).returning();
  return rows[0];
}

export async function updateCharacter(
  id: string,
  input: Partial<{ slug: string; name: string; role: "killer" | "survivor"; chapter: string | null; iconUrl: string | null }>
) {
  await db.update(characters).set({ ...input, updatedAt: new Date() }).where(eq(characters.id, id));
}

/* ========== パーク ========== */

export async function getAllPerksAdmin() {
  return db.select().from(perks).orderBy(asc(perks.role), asc(perks.name));
}

export async function isPerkSlugTaken(slug: string, excludeId?: string) {
  const rows = await db.select({ id: perks.id }).from(perks).where(eq(perks.slug, slug));
  return rows.some((r) => r.id !== excludeId);
}

export async function createPerk(input: {
  slug: string;
  name: string;
  description?: string | null;
  role: "killer" | "survivor";
  originCharacterId?: string | null; // null = 共通パーク、指定あり = そのキャラ固有パーク
  iconUrl?: string | null;
}) {
  const rows = await db.insert(perks).values(input).returning();
  return rows[0];
}

export async function updatePerk(
  id: string,
  input: Partial<{
    slug: string;
    name: string;
    description: string | null;
    role: "killer" | "survivor";
    originCharacterId: string | null;
    iconUrl: string | null;
    isActive: boolean;
  }>
) {
  await db.update(perks).set({ ...input, updatedAt: new Date() }).where(eq(perks.id, id));
}

/* ========== アドオン ========== */

export async function getAllAddonsAdmin() {
  return db.select().from(addons).orderBy(asc(addons.name));
}

export async function isAddonSlugTaken(slug: string, excludeId?: string) {
  const rows = await db.select({ id: addons.id }).from(addons).where(eq(addons.slug, slug));
  return rows.some((r) => r.id !== excludeId);
}

export async function createAddon(input: {
  slug: string;
  name: string;
  description?: string | null;
  rarity: "common" | "uncommon" | "rare" | "very_rare" | "ultra_rare" | "event";
  iconUrl?: string | null;
  killerId?: string | null;
  itemId?: string | null;
}) {
  const rows = await db.insert(addons).values(input).returning();
  return rows[0];
}

export async function updateAddon(
  id: string,
  input: Partial<{
    slug: string;
    name: string;
    description: string | null;
    rarity: "common" | "uncommon" | "rare" | "very_rare" | "ultra_rare" | "event";
    iconUrl: string | null;
    killerId: string | null;
    itemId: string | null;
  }>
) {
  await db.update(addons).set(input).where(eq(addons.id, id));
}

/* ========== マップ ========== */

export async function getAllMapsAdmin() {
  return db.select().from(maps).orderBy(asc(maps.realm), asc(maps.name));
}

export async function isMapSlugTaken(slug: string, excludeId?: string) {
  const rows = await db.select({ id: maps.id }).from(maps).where(eq(maps.slug, slug));
  return rows.some((r) => r.id !== excludeId);
}

export async function createMap(input: { slug: string; name: string; realm?: string | null; iconUrl?: string | null }) {
  const rows = await db.insert(maps).values(input).returning();
  return rows[0];
}

export async function updateMap(id: string, input: Partial<{ slug: string; name: string; realm: string | null; iconUrl: string | null }>) {
  await db.update(maps).set(input).where(eq(maps.id, id));
}

/* ========== アイテム用途の参照(アドオン編集フォームの選択肢用) ========== */

export async function getAllItemsForSelect() {
  return db.select({ id: items.id, name: items.name }).from(items).orderBy(asc(items.name));
}
