"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissReport, deleteReportedPlan } from "./actions";

export function ReportRow({
  report,
}: {
  report: { id: string; reason: string; createdAt: string | Date; planId: string; planSlug: string; planTitle: string; creatorName: string | null };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      await dismissReport(report.id);
      router.refresh();
    });
  }

  function deletePlan() {
    if (!window.confirm(`「${report.planTitle}」を削除します。よろしいですか？`)) return;
    startTransition(async () => {
      await deleteReportedPlan(report.id, report.planId);
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
      <p className="mb-3 text-xs text-bone-muted">通報理由：{report.reason}</p>
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
