"use server";

import { auth } from "@/auth";
import { getPlanBySlug, updateUserPlan } from "@/lib/plans";

/**
 * タグ絞り込み式のパーク抽選(例:コミュニケーション縛り)用の更新処理。
 * poolConfig.source/weightingは変更せずそのまま引き継ぎ、filterTags/excludeTags/countだけを更新する。
 */
export async function updateLotteryPerkPoolPlan(input: {
  slug: string;
  title: string;
  description: string;
  filterTags: string[];
  excludeTags: string[];
  count: number;
}): Promise<{ error?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "この操作にはログインが必要です" };

  const plan = await getPlanBySlug(input.slug);
  if (!plan) return { error: "企画が見つかりません" };
  if (plan.type !== "lottery") return { error: "この企画は抽選型ではありません" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };
  if (input.count < 1) return { error: "抽選枚数は1以上にしてください" };
  if (input.filterTags.length === 0) return { error: "対象タグを1つ以上選んでください" };

  const existingPool = (plan.poolConfig as Record<string, unknown>) ?? {};
  if (existingPool.source !== "perk") return { error: "この企画はタグ絞り込み式のパーク抽選ではありません" };

  try {
    await updateUserPlan(plan.id, { id: session.user.id, isAdmin: !!session.user.isAdmin }, {
      title,
      description: input.description.trim(),
      poolConfig: {
        ...existingPool,
        filterTags: input.filterTags,
        excludeTags: input.excludeTags,
        count: input.count,
      },
    });
    return { slug: input.slug };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "更新に失敗しました。" };
  }
}
