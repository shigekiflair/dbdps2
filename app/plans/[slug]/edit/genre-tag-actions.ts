"use server";

import { auth } from "@/auth";
import { getPlanBySlug } from "@/lib/plans";
import { setPlanGenreTags } from "@/lib/tags";
import { canHostPlan } from "@/lib/permissions";

/**
 * 企画のジャンルタグ(対人系/心理戦系等)を丸ごと置き換える。
 * 内容(poolConfig等)は一切触らないので、編集フォームが無い企画タイプにも使える。
 */
export async function updatePlanGenreTags(input: {
  slug: string;
  tagIds: string[];
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "この操作にはログインが必要です" };

  const plan = await getPlanBySlug(input.slug);
  if (!plan) return { error: "企画が見つかりません" };

  if (!canHostPlan({ userId: session.user.id, isAdmin: !!session.user.isAdmin }, plan.createdBy)) {
    return { error: "この企画を編集できるのは本人だけです" };
  }

  try {
    await setPlanGenreTags(plan.id, input.tagIds);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "ジャンルタグの更新に失敗しました。" };
  }
}
