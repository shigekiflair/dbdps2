"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreDeletedPlan, permanentlyDeletePlanAction } from "./actions";

export function TrashRow({ plan }: { plan: { id: string; slug: string; title: string; type: string; deletedAt: string | Date | null } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      await restoreDeletedPlan(plan.id);
      router.refresh();
    });
  }

  function purge() {
    if (!window.confirm(`「${plan.title}」を完全に削除します。これは取り消せません。よろしいですか？`)) return;
    startTransition(async () => {
      await permanentlyDeletePlanAction(plan.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#2C2C2A] bg-ash p-4">
      <div>
        <p className="text-sm text-bone">{plan.title}</p>
        <p className="text-[10px] text-bone-muted">/plans/{plan.slug}</p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={restore}
          className="rounded-md border border-fog-teal px-3 py-1.5 text-[11px] text-fog-teal disabled:opacity-50"
        >
          復元する
        </button>
        <button
          disabled={isPending}
          onClick={purge}
          className="rounded-md bg-blood px-3 py-1.5 text-[11px] font-medium text-[#FCEBEB] disabled:opacity-50"
        >
          完全に削除
        </button>
      </div>
    </div>
  );
}
