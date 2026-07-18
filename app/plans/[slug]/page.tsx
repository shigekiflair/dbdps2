import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, perks } from "@/db/schema";
import { getPlanBySlug } from "@/lib/plans";
import { planTypeBadge } from "@/lib/plan-ui";
import { getCurrentIdentityId } from "@/lib/identity";
import { getProgress } from "@/lib/progress";
import { LotteryTool } from "@/components/tools/lottery-tool";
import { ChainTool } from "@/components/tools/chain-tool";
import { TrackingTool } from "@/components/tools/tracking-tool";
import { RoleplayTool } from "@/components/tools/roleplay-tool";
import { DataAccumulationTool } from "@/components/tools/data-accumulation-tool";
import { RandomSelectTool } from "@/components/tools/random-select-tool";
import { TargetPickTool } from "@/components/tools/target-pick-tool";
import { EscalationTool } from "@/components/tools/escalation-tool";
import { SharePageButton } from "@/components/share-page-button";

export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);
  if (!plan) notFound();

  const badge = planTypeBadge(plan.type);
  const pool = plan.poolConfig as any;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans" className="mb-4 inline-flex items-center gap-1 text-xs text-bone-muted">
        ← 企画一覧へ
      </a>

      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="mb-2 flex gap-2">
            <span className={`rounded px-2 py-1 text-[10px] ${badge.className}`}>{badge.label}</span>
            <span className="rounded border border-[#2C2C2A] px-2 py-1 text-[10px] text-bone-muted">
              {plan.target === "both" ? "両方対応" : plan.target}
            </span>
          </div>
          <h1 className="text-lg font-medium text-bone">{plan.title}</h1>
        </div>
        <SharePageButton />
      </div>

      <p className="mb-5 border-b border-[#2C2C2A] pb-5 text-xs leading-relaxed text-bone-muted">
        {plan.description}
      </p>

      {plan.type === "lottery" && pool?.source !== "character_build" && (
        <LotteryTool
          plan={{
            slug: plan.slug,
            target: plan.target,
            inputFields: plan.inputFields as any,
            defaultCount: (pool?.count as number) ?? 4,
          }}
        />
      )}

      {pool?.source === "character_build" && <RandomSelectLoader />}

      {plan.type === "chain" && <ChainTool missions={pool?.customPool ?? []} />}

      {plan.type === "tracking" && (
        <TrackingToolLoader planId={plan.id} slug={plan.slug} pool={pool} />
      )}

      {plan.type === "roleplay" && <RoleplayTool items={pool?.customPool ?? []} />}

      {plan.type === "data_accumulation" && (
        <DataAccumulationLoader planId={plan.id} slug={plan.slug} pool={pool} />
      )}

      {plan.type === "target_pick" && <TargetPickTool plan={{ slug: plan.slug }} />}

      {plan.type === "escalation" && (
        <EscalationLoader planId={plan.id} slug={plan.slug} pool={pool} />
      )}
      {/* draft / betting 等の残りのタイプはPhase5で追加 */}
    </main>
  );
}

async function DataAccumulationLoader({
  planId,
  slug,
  pool,
}: {
  planId: string;
  slug: string;
  pool: { customPool?: string[] };
}) {
  const categories = pool?.customPool ?? [];
  const identityId = await getCurrentIdentityId();
  const progress = identityId ? await getProgress(planId, identityId) : null;
  const initialRecords = ((progress?.progressPayload as any)?.records as Record<string, number>) ?? {};

  return <DataAccumulationTool plan={{ slug }} categories={categories} initialRecords={initialRecords} />;
}

async function RandomSelectLoader() {
  const [killers, survivors, killerPerks, survivorPerks] = await Promise.all([
    db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.role, "killer")),
    db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.role, "survivor")),
    db.select({ id: perks.id, name: perks.name }).from(perks).where(eq(perks.role, "killer")),
    db.select({ id: perks.id, name: perks.name }).from(perks).where(eq(perks.role, "survivor")),
  ]);

  return (
    <RandomSelectTool
      killers={killers}
      survivors={survivors}
      killerPerks={killerPerks}
      survivorPerks={survivorPerks}
    />
  );
}

async function EscalationLoader({
  planId,
  slug,
  pool,
}: {
  planId: string;
  slug: string;
  pool: { customPool?: string[]; threshold?: number };
}) {
  const identityId = await getCurrentIdentityId();
  const progress = identityId ? await getProgress(planId, identityId) : null;
  const payload = (progress?.progressPayload as { points?: number; triggeredIndices?: number[] }) ?? {};

  return (
    <EscalationTool
      plan={{ slug }}
      rulePool={pool?.customPool ?? []}
      threshold={pool?.threshold ?? 3}
      initialPoints={payload.points ?? 0}
      initialTriggeredIndices={payload.triggeredIndices ?? []}
    />
  );
}

async function TrackingToolLoader({
  planId,
  slug,
  pool,
}: {
  planId: string;
  slug: string;
  pool: { source?: string; role?: "survivor" | "killer" };
}) {
  let items: { id: string; name: string }[] = [];

  if (pool?.source === "killer") {
    items = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.role, "killer"));
  } else if (pool?.source === "survivor") {
    items = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.role, "survivor"));
  } else if (pool?.source === "perk" && pool.role) {
    items = await db
      .select({ id: perks.id, name: perks.name })
      .from(perks)
      .where(eq(perks.role, pool.role));
  }

  const identityId = await getCurrentIdentityId();
  const progress = identityId ? await getProgress(planId, identityId) : null;
  const initialChecked = ((progress?.progressPayload as any)?.checkedItems as string[]) ?? [];

  return <TrackingTool plan={{ slug }} items={items} initialChecked={initialChecked} />;
}
