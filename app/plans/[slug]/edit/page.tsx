import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { getPlanBySlug } from "@/lib/plans";
import { TierListPlanForm } from "@/components/plan-builder/tier-list-form";

export default async function EditPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/plans/${slug}/edit`);

  const plan = await getPlanBySlug(slug);
  if (!plan) notFound();
  if (plan.createdBy !== session.user.id) notFound();

  // Phase1ではティア表の編集フォームのみ対応（文字列リスト型は現状、作成のみ）
  if (plan.type !== "tier_list") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <p className="text-xs text-bone-muted">
          この企画タイプの編集フォームはまだありません。マイページから削除して作り直してください。
        </p>
      </main>
    );
  }

  const killers = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.role, "killer"));

  const pool = plan.poolConfig as { tiers?: any[]; assignments?: Record<string, string> } | null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href={`/plans/${slug}`} className="mb-4 inline-flex items-center gap-1 text-xs text-bone-muted">
        ← 企画ページに戻る
      </a>
      <h1 className="mb-6 text-lg font-medium text-bone">ティア表を編集</h1>
      <TierListPlanForm
        killers={killers}
        mode="edit"
        slug={slug}
        initialTitle={plan.title}
        initialDescription={plan.description ?? ""}
        initialVisibility={plan.visibility}
        initialTiers={pool?.tiers as any}
        initialAssignments={pool?.assignments}
      />
    </main>
  );
}
