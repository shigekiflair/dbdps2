"use server";

import { auth } from "@/auth";
import { canManageGameData } from "@/lib/permissions";
import {
  isCharacterSlugTaken,
  createCharacter,
  updateCharacter,
  isPerkSlugTaken,
  createPerk,
  updatePerk,
  isAddonSlugTaken,
  createAddon,
  updateAddon,
  isMapSlugTaken,
  createMap,
  updateMap,
} from "@/lib/game-data";

/** Server Actionは本番だとthrowしたエラーメッセージが握りつぶされるため、必ず戻り値でエラーを返す */
async function requireCollaborator(): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  const allowed = canManageGameData(
    session?.user?.id
      ? { userId: session.user.id, isAdmin: !!session.user.isAdmin, isCollaborator: !!session.user.isCollaborator }
      : null
  );
  if (!allowed) return { error: "この操作にはコラボレーター権限が必要です" };
  return { ok: true };
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function validateSlug(slug: string): string | null {
  if (!slug.trim()) return "slugを入力してください";
  if (!SLUG_PATTERN.test(slug)) return "slugは半角英小文字・数字・ハイフンのみ使用できます";
  return null;
}

/* ========== キャラクター ========== */

export async function createCharacterAction(input: {
  slug: string;
  name: string;
  role: "killer" | "survivor";
  chapter: string;
  iconUrl: string;
}): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isCharacterSlugTaken(input.slug)) return { error: "このslugは既に使われています" };

  try {
    await createCharacter({
      slug: input.slug,
      name: input.name.trim(),
      role: input.role,
      chapter: input.chapter.trim() || null,
      iconUrl: input.iconUrl.trim() || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。" };
  }
}

export async function updateCharacterAction(
  id: string,
  input: { slug: string; name: string; role: "killer" | "survivor"; chapter: string; iconUrl: string }
): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isCharacterSlugTaken(input.slug, id)) return { error: "このslugは既に使われています" };

  try {
    await updateCharacter(id, {
      slug: input.slug,
      name: input.name.trim(),
      role: input.role,
      chapter: input.chapter.trim() || null,
      iconUrl: input.iconUrl.trim() || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "更新に失敗しました。" };
  }
}

/* ========== パーク ========== */

export async function createPerkAction(input: {
  slug: string;
  name: string;
  description: string;
  role: "killer" | "survivor";
  originCharacterId: string; // ""なら共通パーク
  iconUrl: string;
}): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isPerkSlugTaken(input.slug)) return { error: "このslugは既に使われています" };

  try {
    await createPerk({
      slug: input.slug,
      name: input.name.trim(),
      description: input.description.trim() || null,
      role: input.role,
      originCharacterId: input.originCharacterId || null,
      iconUrl: input.iconUrl.trim() || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。" };
  }
}

export async function updatePerkAction(
  id: string,
  input: {
    slug: string;
    name: string;
    description: string;
    role: "killer" | "survivor";
    originCharacterId: string;
    iconUrl: string;
    isActive: boolean;
  }
): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isPerkSlugTaken(input.slug, id)) return { error: "このslugは既に使われています" };

  try {
    await updatePerk(id, {
      slug: input.slug,
      name: input.name.trim(),
      description: input.description.trim() || null,
      role: input.role,
      originCharacterId: input.originCharacterId || null,
      iconUrl: input.iconUrl.trim() || null,
      isActive: input.isActive,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "更新に失敗しました。" };
  }
}

/* ========== アドオン ========== */

type Rarity = "common" | "uncommon" | "rare" | "very_rare" | "ultra_rare" | "event";

export async function createAddonAction(input: {
  slug: string;
  name: string;
  description: string;
  rarity: Rarity;
  iconUrl: string;
  killerId: string; // どちらか一方のみ指定
  itemId: string;
}): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (input.killerId && input.itemId) return { error: "キラー用・アイテム用のどちらか一方だけ選んでください" };
  if (!input.killerId && !input.itemId) return { error: "対象のキラーかアイテムを選んでください" };
  if (await isAddonSlugTaken(input.slug)) return { error: "このslugは既に使われています" };

  try {
    await createAddon({
      slug: input.slug,
      name: input.name.trim(),
      description: input.description.trim() || null,
      rarity: input.rarity,
      iconUrl: input.iconUrl.trim() || null,
      killerId: input.killerId || null,
      itemId: input.itemId || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。" };
  }
}

export async function updateAddonAction(
  id: string,
  input: { slug: string; name: string; description: string; rarity: Rarity; iconUrl: string; killerId: string; itemId: string }
): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (input.killerId && input.itemId) return { error: "キラー用・アイテム用のどちらか一方だけ選んでください" };
  if (!input.killerId && !input.itemId) return { error: "対象のキラーかアイテムを選んでください" };
  if (await isAddonSlugTaken(input.slug, id)) return { error: "このslugは既に使われています" };

  try {
    await updateAddon(id, {
      slug: input.slug,
      name: input.name.trim(),
      description: input.description.trim() || null,
      rarity: input.rarity,
      iconUrl: input.iconUrl.trim() || null,
      killerId: input.killerId || null,
      itemId: input.itemId || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "更新に失敗しました。" };
  }
}

/* ========== マップ ========== */

export async function createMapAction(input: {
  slug: string;
  name: string;
  realm: string;
  iconUrl: string;
}): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isMapSlugTaken(input.slug)) return { error: "このslugは既に使われています" };

  try {
    await createMap({
      slug: input.slug,
      name: input.name.trim(),
      realm: input.realm.trim() || null,
      iconUrl: input.iconUrl.trim() || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。" };
  }
}

export async function updateMapAction(
  id: string,
  input: { slug: string; name: string; realm: string; iconUrl: string }
): Promise<{ error?: string }> {
  const check = await requireCollaborator();
  if ("error" in check) return check;

  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError };
  if (!input.name.trim()) return { error: "名前を入力してください" };
  if (await isMapSlugTaken(input.slug, id)) return { error: "このslugは既に使われています" };

  try {
    await updateMap(id, {
      slug: input.slug,
      name: input.name.trim(),
      realm: input.realm.trim() || null,
      iconUrl: input.iconUrl.trim() || null,
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "更新に失敗しました。" };
  }
}
