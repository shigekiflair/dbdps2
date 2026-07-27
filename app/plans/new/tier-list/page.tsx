import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { TierListPlanForm } from "@/components/plan-builder/tier-list-form";

export default async function NewTierListPlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/plans/new/tier-list");

  const killers = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.role, "killer"));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans/new" className="mb-4 inline-flex items-center gap-1 text-xs text-bone-muted">
        ← タイプ選択に戻る
      </a>
      <h1 className="mb-6 text-lg font-medium text-bone">ティア表を作る</h1>
      <TierListPlanForm killers={killers} mode="create" />
    </main>
  );
}
