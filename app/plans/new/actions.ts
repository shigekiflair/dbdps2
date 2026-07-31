"use server";

import { auth } from "@/auth";
import { createUserPlan, updateUserPlan, getPlanBySlug } from "@/lib/plans";

type Visibility = "private" | "unlisted" | "public";
type StringListType = "trigger_internal" | "chain" | "roleplay" | "escalation" | "data_accumulation" | "betting";
type TierConfig = { id: string; label: string; color: string };

/**
 * Server Actionは本番ビルドだとthrowしたErrorのメッセージが握りつぶされて汎用エラーになるため
 * (Next.jsの仕様。開発環境では気づけない)、バリデーションエラーは例外ではなく戻り値で返す。
 * 呼び出し側は必ず`if (result.error)`を先にチェックすること。
 */
async function getUserId(): Promise<string | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "この操作にはログインが必要です" };
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
}): Promise<{ error?: string; slug?: string }> {
  const userId = await getUserId();
  if (typeof userId !== "string") return userId;

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  const cleanItems = input.items.map((i) => i.trim()).filter(Boolean);
  if (input.type !== "betting" && cleanItems.length === 0) {
    return { error: "項目を1つ以上入力してください" };
  }

  const poolConfig =
    input.type === "betting"
      ? {}
      : input.type === "escalation"
        ? { customPool: cleanItems, threshold: input.threshold ?? 3 }
        : { customPool: cleanItems };

  try {
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
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。時間をおいてもう一度お試しください。" };
  }
}

export async function createTierListPlan(input: {
  title: string;
  description: string;
  visibility: Visibility;
  tiers: TierConfig[];
  assignments: Record<string, string>;
}): Promise<{ error?: string; slug?: string }> {
  const userId = await getUserId();
  if (typeof userId !== "string") return userId;

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };
  if (input.tiers.length === 0) return { error: "ランクを1つ以上作成してください" };

  try {
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
  } catch (err) {
    console.error(err);
    return { error: "作成に失敗しました。時間をおいてもう一度お試しください。" };
  }
}

export async function updateTierListPlan(input: {
  slug: string;
  title: string;
  description: string;
  visibility: Visibility;
  tiers: TierConfig[];
  assignments: Record<string, string>;
}): Promise<{ error?: string; slug?: string }> {
  const userId = await getUserId();
  if (typeof userId !== "string") return userId;

  const plan = await getPlanBySlug(input.slug);
  if (!plan) return { error: "企画が見つかりません" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  try {
    await updateUserPlan(plan.id, userId, {
      title,
      description: input.description.trim(),
      visibility: input.visibility,
      poolConfig: { tiers: input.tiers, assignments: input.assignments },
    });
    return { slug: input.slug };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "更新に失敗しました。" };
  }
}
