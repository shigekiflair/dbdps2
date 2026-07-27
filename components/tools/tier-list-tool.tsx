import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";

type TierListConfig = {
  tiers: { id: string; label: string; color: string }[];
  assignments: Record<string, string>; // killerId -> tierId
};

/**
 * ティア表の読み取り専用表示。poolConfigにはkillerIdしか入っていないので、
 * ここでキラー名を解決してから表示する（新キラーが追加されても「未振り分け」に自然に出てくる）。
 */
export async function TierListView({ poolConfig }: { poolConfig: TierListConfig | null }) {
  const allKillers = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.role, "killer"));

  const tiers = poolConfig?.tiers ?? [];
  const assignments = poolConfig?.assignments ?? {};
  const killerNameById = new Map(allKillers.map((k) => [k.id, k.name]));

  const unranked = allKillers.filter((k) => !assignments[k.id]);

  return (
    <div className="space-y-2">
      {tiers.map((tier) => {
        const killerIds = Object.entries(assignments)
          .filter(([, tierId]) => tierId === tier.id)
          .map(([killerId]) => killerId)
          .filter((id) => killerNameById.has(id));

        return (
          <div key={tier.id} className="flex overflow-hidden rounded-lg border border-[#2C2C2A]">
            <div
              className="flex w-16 shrink-0 items-center justify-center px-2 py-3 text-sm font-bold text-[#0A0A0C]"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 bg-ash p-2">
              {killerIds.length === 0 ? (
                <span className="text-[11px] text-bone-muted">（なし）</span>
              ) : (
                killerIds.map((id) => (
                  <span
                    key={id}
                    className="rounded-md border border-[#2C2C2A] bg-ash2 px-2 py-1 text-xs text-bone"
                  >
                    {killerNameById.get(id)}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}

      {unranked.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-[#2C2C2A] p-3">
          <p className="mb-2 text-[11px] text-bone-muted">未振り分け</p>
          <div className="flex flex-wrap gap-2">
            {unranked.map((k) => (
              <span key={k.id} className="rounded-md border border-[#2C2C2A] px-2 py-1 text-xs text-bone-muted">
                {k.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
