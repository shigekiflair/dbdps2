import Link from "next/link";
import { planTypeBadge } from "@/lib/plan-ui";
import { FavoriteButton } from "./favorite-button";

type GenreTag = { id: string; slug: string; label: string; color: string | null };

type PlanCardData = {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  genreTags?: GenreTag[];
};

export function PlanCard({
  plan,
  favorited = false,
}: {
  plan: PlanCardData;
  favorited?: boolean;
}) {
  const badge = planTypeBadge(plan.type);
  return (
    <div className="rounded-card border border-[#2C2C2A] bg-ash p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-block rounded px-2 py-1 text-[10px] ${badge.className}`}>
          {badge.label}
        </span>
        <FavoriteButton slug={plan.slug} initialFavorited={favorited} />
      </div>
      <p className="mt-2 text-sm font-medium text-bone">{plan.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-bone-muted">{plan.description}</p>
      {plan.genreTags && plan.genreTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {plan.genreTags.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-[#2C2C2A] px-2 py-0.5 text-[10px] text-bone-muted"
              style={t.color ? { borderColor: t.color, color: t.color } : undefined}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/plans/${plan.slug}`}
        className="mt-3 block rounded-md border border-[#2C2C2A] py-1.5 text-center text-xs text-bone hover:bg-ash2"
      >
        試す
      </Link>
    </div>
  );
}
