"use server";

import { auth } from "@/auth";
import { getPlanBySlug, updateUserPlan } from "@/lib/plans";

/**
 * poolConfigに実質的な設定項目が無い運営企画(例:ランダムセレクトのsource:"character_build")向けの、
 * タイトル・説明文だけを編集する汎用フォーム用アクション。poolConfig自体は一切触らない。
 */
export async function updateBasicPlanInfo(input: {
  slug: string;
  title: string;
  description: string;
}): Promise<{ error?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "この操作にはログインが必要です" };

  const plan = await getPlanBySlug(input.slug);
  if (!plan) return { error: "企画が見つかりません" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  try {
    await updateUserPlan(plan.id, { id: session.user.id, isAdmin: !!session.user.isAdmin }, {
      title,
      description: input.description.trim(),
    });
    return { slug: input.slug };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "更新に失敗しました。" };
  }
}
