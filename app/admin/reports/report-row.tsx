"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { dismissReport, deleteReportedPlan } from "./actions";

export function ReportRow({
  report,
}: {
  report: { id: string; reason: string; createdAt: string | Date; planId: string; planSlug: string; planTitle: string; creatorName: string | null };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function dismiss() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await dismissReport(report.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function deletePlan() {
    const ok = await confirm({
      message: `「${report.planTitle}」を削除します。よろしいですか？`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteReportedPlan(report.id, report.planId);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
      <div className="mb-1 flex items-center justify-between">
        <a href={`/plans/${report.planSlug}`} className="text-sm font-medium text-bone underline">
          {report.planTitle}
        </a>
        <span className="text-[10px] text-bone-muted">作成者：{report.creatorName ?? "匿名"}</span>
      </div>
      <p className="mb-2 text-xs text-bone-muted">通報理由：{report.reason}</p>
      {errorMessage && <p className="mb-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={dismiss}
          className="rounded-md border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted disabled:opacity-50"
        >
          問題なし（却下）
        </button>
        <button
          disabled={isPending}
          onClick={deletePlan}
          className="rounded-md bg-blood px-3 py-1.5 text-[11px] font-medium text-[#FCEBEB] disabled:opacity-50"
        >
          企画を削除する
        </button>
      </div>
    </div>
  );
}
