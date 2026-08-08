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

type GenreTag = { id: string; slug: string; label: string; color: string | null };

type PlanListItem = {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  genreTags?: GenreTag[];
};

export function PlanFilterBar({
  plans,
  favoriteSlugs = [],
  genreTags = [],
}: {
  plans: PlanListItem[];
  favoriteSlugs?: string[];
  genreTags?: GenreTag[];
}) {
  const [type, setType] = useState("all");
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const filtered = useMemo(() => {
    let result = plans;
    if (type === "favorites") result = result.filter((p) => favoriteSet.has(p.slug));
    else if (type !== "all") result = result.filter((p) => p.type === type);

    if (genreSlug) {
      result = result.filter((p) => p.genreTags?.some((t) => t.slug === genreSlug));
    }
    return result;
  }, [plans, type, favoriteSet, genreSlug]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
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

      {genreTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setGenreSlug(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              genreSlug === null ? "border-amber text-amber" : "border-[#2C2C2A] text-bone-muted"
            }`}
          >
            ジャンル: すべて
          </button>
          {genreTags.map((t) => (
            <button
              key={t.id}
              onClick={() => setGenreSlug(genreSlug === t.slug ? null : t.slug)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                genreSlug === t.slug ? "border-amber text-amber" : "border-[#2C2C2A] text-bone-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

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
