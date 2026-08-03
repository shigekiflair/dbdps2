"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { planTypeBadge } from "@/lib/plan-ui";
import { deleteMyPlan } from "@/app/mypage/actions";

const VISIBILITY_LABEL: Record<string, string> = {
  private: "自分だけ",
  unlisted: "リンク限定",
  public: "公開",
};

export function MyPlanCard({
  plan,
}: {
  plan: { id: string; slug: string; title: string; type: string; visibility: string };
}) {
  const router = useRouter();
  const badge = planTypeBadge(plan.type);
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteMyPlan(plan.id);
      if (result.error) {
        setErrorMessage(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-[#2C2C2A] bg-ash p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={`inline-block rounded px-2 py-1 text-[10px] ${badge.className}`}>{badge.label}</span>
        <span className="text-[10px] text-bone-muted">{VISIBILITY_LABEL[plan.visibility] ?? plan.visibility}</span>
      </div>
      <p className="mb-3 text-sm font-medium text-bone">{plan.title}</p>
      {errorMessage && <p className="mb-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
      <div className="flex gap-2 text-xs">
        <a
          href={`/plans/${plan.slug}`}
          className="flex-1 rounded-md border border-[#2C2C2A] py-1.5 text-center text-bone hover:bg-ash2"
        >
          見る
        </a>
        {["tier_list", "trigger_internal", "chain", "roleplay", "escalation", "data_accumulation", "betting"].includes(
          plan.type
        ) && (
          <a
            href={`/plans/${plan.slug}/edit`}
            className="flex-1 rounded-md border border-[#2C2C2A] py-1.5 text-center text-bone hover:bg-ash2"
          >
            編集
          </a>
        )}
        <button
          disabled={isPending}
          onClick={handleDelete}
          className={`rounded-md border px-2 py-1.5 text-center disabled:opacity-60 ${
            confirming ? "border-blood text-blood" : "border-[#2C2C2A] text-bone-muted"
          }`}
        >
          {confirming ? "本当に削除？" : "削除"}
        </button>
      </div>
    </div>
  );
}
