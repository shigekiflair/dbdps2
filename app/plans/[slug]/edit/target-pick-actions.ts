"use server";

import { auth } from "@/auth";
import { getPlanBySlug, updateUserPlan } from "@/lib/plans";

/**
 * ターゲット指定型(target_pick)は運営キュレーション企画のみ(ユーザーは新規作成できない)。
 * poolConfigは実質トリガー型等と同じ{ source: "custom_text", customPool: string[] }だが、
 * source/countフィールドを消さないよう明示的に引き継ぐ専用の更新処理にしている。
 */
export async function updateTargetPickPlan(input: {
  slug: string;
  title: string;
  description: string;
  items: string[];
}): Promise<{ error?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "この操作にはログインが必要です" };

  const plan = await getPlanBySlug(input.slug);
  if (!plan) return { error: "企画が見つかりません" };
  if (plan.type !== "target_pick") return { error: "この企画はターゲット指定型ではありません" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  const cleanItems = input.items.map((i) => i.trim()).filter(Boolean);
  if (cleanItems.length === 0) return { error: "候補を1つ以上入力してください" };

  const existingPool = (plan.poolConfig as Record<string, unknown>) ?? {};

  try {
    await updateUserPlan(plan.id, { id: session.user.id, isAdmin: !!session.user.isAdmin }, {
      title,
      description: input.description.trim(),
      poolConfig: {
        ...existingPool,
        source: "custom_text",
        customPool: cleanItems,
        count: (existingPool.count as number | undefined) ?? 1,
      },
    });
    return { slug: input.slug };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "更新に失敗しました。" };
  }
}
