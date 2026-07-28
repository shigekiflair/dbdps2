"use client";

import { useState, useTransition } from "react";
import { reportPlan } from "@/app/plans/[slug]/report-actions";

export function ReportPlanButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await reportPlan(slug, reason);
        setDone(true);
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (done) {
    return <p className="text-[10px] text-bone-muted">通報を受け付けました。ご協力ありがとうございます。</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[10px] text-bone-muted underline">
        この企画を通報する
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[#2C2C2A] p-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="通報理由（不適切な内容の詳細など）"
        className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone placeholder:text-bone-muted"
      />
      <div className="mt-1.5 flex gap-2">
        <button
          disabled={isPending || !reason.trim()}
          onClick={submit}
          className="rounded-md bg-blood px-3 py-1 text-[10px] font-medium text-[#FCEBEB] disabled:opacity-50"
        >
          通報する
        </button>
        <button onClick={() => setOpen(false)} className="text-[10px] text-bone-muted">
          キャンセル
        </button>
      </div>
    </div>
  );
}
