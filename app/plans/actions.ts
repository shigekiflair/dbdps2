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

  return { character, perks };
}

export async function shareBuildResult(payload: {
  role: "survivor" | "killer";
  character: { id: string; name: string; iconUrl: string | null } | null;
  perks: { id: string; name: string; iconUrl: string | null }[];
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

export async function saveRecordValue(slug: string, records: Record<string, number>) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const identityId = await ensureCurrentIdentityId();
  await upsertProgress(plan.id, identityId, { records });
}
