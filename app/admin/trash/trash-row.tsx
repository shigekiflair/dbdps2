"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { restoreDeletedPlan, permanentlyDeletePlanAction } from "./actions";

export function TrashRow({ plan }: { plan: { id: string; slug: string; title: string; type: string; deletedAt: string | Date | null } }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function restore() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await restoreDeletedPlan(plan.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function purge() {
    const ok = await confirm({
      message: `「${plan.title}」を完全に削除します。これは取り消せません。よろしいですか？`,
      confirmLabel: "完全に削除する",
      danger: true,
    });
    if (!ok) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await permanentlyDeletePlanAction(plan.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
      <div className="flex items-center justify-between">
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
      {errorMessage && <p className="mt-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
    </div>
  );
}
