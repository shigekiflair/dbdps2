"use server";

import { drawFromPool } from "@/lib/draw";
import { getPlanBySlug } from "@/lib/plans";
import { saveResult } from "@/lib/results";
import { ensureCurrentIdentityId } from "@/lib/identity";
import { upsertProgress } from "@/lib/progress";

export async function drawPlanResult(
  slug: string,
  opts: { role?: "survivor" | "killer"; excludeIds?: string[]; count?: number } = {}
) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");

  const pool = { ...(plan.poolConfig as Parameters<typeof drawFromPool>[0]) };
  if (opts.count) pool.count = opts.count;
  return drawFromPool(pool, opts);
}

export async function sharePlanResult(
  slug: string,
  resultPayload: { id: string; name: string; iconUrl: string | null }[]
) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  return saveResult(plan.id, resultPayload);
}

export async function drawBuildSlot(
  role: "survivor" | "killer",
  opts: {
    needCharacter: boolean;
    perkCount: number;
    excludePerkIds?: string[];
    excludeCharacterIds?: string[];
    // キラーのアドオン抽選（サバイバー側は今回未対応。needCharacter=falseの行を
    // 再抽選する際は、既に確定しているキラーIDをcurrentKillerIdで渡す）
    addonCount?: number;
    excludeAddonIds?: string[];
    currentKillerId?: string;
  }
) {
  const character = opts.needCharacter
    ? (await drawFromPool({ source: role, count: 1 }, { excludeIds: opts.excludeCharacterIds }))[0] ?? null
    : null;

  const perks =
    opts.perkCount > 0
      ? await drawFromPool(
          { source: "perk", filterTags: [], count: opts.perkCount },
          { role, excludeIds: opts.excludePerkIds }
        )
      : [];

  const killerId = character?.id ?? (opts.needCharacter ? null : opts.currentKillerId ?? null);
  const addons =
    role === "killer" && killerId && (opts.addonCount ?? 0) > 0
      ? await drawFromPool(
          { source: "addon", count: opts.addonCount },
          { killerId, excludeIds: opts.excludeAddonIds }
        )
      : [];

  return { character, perks, addons };
}

/** 詳細ルール設定の「禁止アドオン」選択肢を作るため、指定キラーの全アドオンを取得する */
export async function getKillerAddons(killerId: string) {
  return drawFromPool({ source: "addon", count: 9999 }, { killerId });
}

export async function shareBuildResult(payload: {
  role: "survivor" | "killer";
  character: { id: string; name: string; iconUrl: string | null } | null;
  perks: { id: string; name: string; iconUrl: string | null }[];
  addons?: { id: string; name: string; iconUrl: string | null }[];
}) {
  const plan = await getPlanBySlug("random-select");
  if (!plan) throw new Error("plan not found");
  return saveResult(plan.id, payload);
}

export async function savePlanProgress(slug: string, checkedItems: string[]) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const identityId = await ensureCurrentIdentityId();
  await upsertProgress(plan.id, identityId, { checkedItems });
}

/** checkedItems以外の任意の進捗ペイロードを保存する汎用版（エスカレーション型など） */
export async function savePlanProgressPayload(slug: string, payload: Record<string, unknown>) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const identityId = await ensureCurrentIdentityId();
  await upsertProgress(plan.id, identityId, payload);
}

export async function saveRecordValue(slug: string, records: Record<string, number>) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const identityId = await ensureCurrentIdentityId();
  await upsertProgress(plan.id, identityId, { records });
}
