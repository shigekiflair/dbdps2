"use server";

import { auth } from "@/auth";
import { createUserPlan, updateUserPlan, getPlanBySlug } from "@/lib/plans";

type Visibility = "private" | "unlisted" | "public";
type StringListType = "trigger_internal" | "chain" | "roleplay" | "escalation" | "data_accumulation" | "betting";
type TierConfig = { id: string; label: string; color: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("この操作にはログインが必要です");
  return session.user.id;
}

/** トリガー・チェイン・ロールプレイ・エスカレーション・データ蓄積・ベッティングの各企画を作成する */
export async function createStringListPlan(input: {
  type: StringListType;
  title: string;
  description: string;
  visibility: Visibility;
  items: string[];
  threshold?: number;
}): Promise<{ slug: string }> {
  const userId = await requireUserId();

  const title = input.title.trim();
  if (!title) throw new Error("タイトルを入力してください");

  const cleanItems = input.items.map((i) => i.trim()).filter(Boolean);
  if (input.type !== "betting" && cleanItems.length === 0) {
    throw new Error("項目を1つ以上入力してください");
  }

  const poolConfig =
    input.type === "betting"
      ? {}
      : input.type === "escalation"
        ? { customPool: cleanItems, threshold: input.threshold ?? 3 }
        : { customPool: cleanItems };

  const plan = await createUserPlan({
    title,
    description: input.description.trim(),
    type: input.type,
    target: "viewer",
    visibility: input.visibility,
    poolConfig,
    createdBy: userId,
  });

  return { slug: plan.slug };
}

export async function createTierListPlan(input: {
  title: string;
  description: string;
  visibility: Visibility;
  tiers: TierConfig[];
  assignments: Record<string, string>;
}): Promise<{ slug: string }> {
  const userId = await requireUserId();

  const title = input.title.trim();
  if (!title) throw new Error("タイトルを入力してください");
  if (input.tiers.length === 0) throw new Error("ランクを1つ以上作成してください");

  const plan = await createUserPlan({
    title,
    description: input.description.trim(),
    type: "tier_list",
    target: "viewer",
    visibility: input.visibility,
    poolConfig: { tiers: input.tiers, assignments: input.assignments },
    createdBy: userId,
  });

  return { slug: plan.slug };
}

export async function updateTierListPlan(input: {
  slug: string;
  title: string;
  description: string;
  visibility: Visibility;
  tiers: TierConfig[];
  assignments: Record<string, string>;
}): Promise<{ slug: string }> {
  const userId = await requireUserId();
  const plan = await getPlanBySlug(input.slug);
  if (!plan) throw new Error("企画が見つかりません");

  const title = input.title.trim();
  if (!title) throw new Error("タイトルを入力してください");

  await updateUserPlan(plan.id, userId, {
    title,
    description: input.description.trim(),
    visibility: input.visibility,
    poolConfig: { tiers: input.tiers, assignments: input.assignments },
  });

  return { slug: input.slug };
}
