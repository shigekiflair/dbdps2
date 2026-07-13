import Link from "next/link";
import { planTypeBadge } from "@/lib/plan-ui";

type PlanCardData = {
  slug: string;
  title: string;
  description: string | null;
  type: string;
};

export function PlanCard({ plan }: { plan: PlanCardData }) {
  const badge = planTypeBadge(plan.type);
  return (
    <div className="rounded-card border border-[#2C2C2A] bg-ash p-4">
      <span className={`inline-block rounded px-2 py-1 text-[10px] ${badge.className}`}>
        {badge.label}
      </span>
      <p className="mt-2 text-sm font-medium text-bone">{plan.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-bone-muted">{plan.description}</p>
      <Link
        href={`/plans/${plan.slug}`}
        className="mt-3 block rounded-md border border-[#2C2C2A] py-1.5 text-center text-xs text-bone hover:bg-ash2"
      >
        試す
      </Link>
    </div>
  );
}
