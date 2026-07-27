import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StringListPlanForm } from "@/components/plan-builder/string-list-form";

const VALID_TYPES = ["trigger_internal", "chain", "roleplay", "escalation", "data_accumulation", "betting"] as const;
type ValidType = (typeof VALID_TYPES)[number];

export default async function NewStringListPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/plans/new");

  const { type } = await searchParams;
  if (!type || !VALID_TYPES.includes(type as ValidType)) redirect("/plans/new");

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans/new" className="mb-4 inline-flex items-center gap-1 text-xs text-bone-muted">
        ← タイプ選択に戻る
      </a>
      <h1 className="mb-6 text-lg font-medium text-bone">企画を作る</h1>
      <StringListPlanForm type={type as ValidType} />
    </main>
  );
}
