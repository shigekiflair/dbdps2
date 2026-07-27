"use client";

import { useMemo, useState } from "react";
import { PlanCard } from "./plan-card";

const TYPE_FILTERS = [
  { value: "all", label: "すべて" },
  { value: "favorites", label: "★お気に入り" },
  { value: "lottery", label: "抽選型" },
  { value: "tracking", label: "進捗型" },
  { value: "data_accumulation", label: "データ蓄積" },
  { value: "betting", label: "視聴者参加" },
];

type PlanListItem = {
  slug: string;
  title: string;
  description: string | null;
  type: string;
};

export function PlanFilterBar({
  plans,
  favoriteSlugs = [],
}: {
  plans: PlanListItem[];
  favoriteSlugs?: string[];
}) {
  const [type, setType] = useState("all");
  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const filtered = useMemo(() => {
    if (type === "all") return plans;
    if (type === "favorites") return plans.filter((p) => favoriteSet.has(p.slug));
    return plans.filter((p) => p.type === type);
  }, [plans, type, favoriteSet]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
              type === t.value
                ? "bg-blood text-[#FCEBEB]"
                : "border border-[#2C2C2A] text-bone-muted hover:border-[#444441]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-xs text-bone-muted">
          {type === "favorites" ? "まだお気に入りに追加した企画がありません。カードの☆から追加できます。" : "該当する企画がまだありません。"}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PlanCard key={p.slug} plan={p} favorited={favoriteSet.has(p.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}
