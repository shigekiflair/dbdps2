"use client";

import { useState, useTransition } from "react";
import { saveRecordValue } from "@/app/plans/actions";

export function DataAccumulationTool({
  plan,
  categories,
  initialRecords,
}: {
  plan: { slug: string };
  categories: string[];
  initialRecords: Record<string, number>;
}) {
  const [records, setRecords] = useState<Record<string, number>>(initialRecords);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [value, setValue] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const num = parseFloat(value);
    if (Number.isNaN(num) || !category) return;

    // 記録は「秒数が短いほど良い」前提(最速救助/最速全滅など)
    const currentBest = records[category];
    const isNewBest = currentBest === undefined || num < currentBest;

    startSaving(async () => {
      if (isNewBest) {
        const next = { ...records, [category]: num };
        setRecords(next);
        await saveRecordValue(plan.slug, next);
        setMessage("自己ベスト更新！");
      } else {
        setMessage("自己ベストには届きませんでした");
      }
      setValue("");
      setTimeout(() => setMessage(null), 2000);
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map((c) => (
          <div key={c} className="rounded-lg border border-[#2C2C2A] bg-ash p-3 text-center">
            <p className="text-[10px] text-bone-muted">{c}</p>
            <p className="mt-1 text-sm text-bone">
              {records[c] !== undefined ? `${records[c]}秒` : "未記録"}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[#2C2C2A] bg-ash px-2 py-2 text-xs text-bone"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="秒数"
          className="flex-1 rounded-lg border border-[#2C2C2A] bg-ash px-3 py-2 text-xs text-bone"
        />
      </div>

      <button
        disabled={isSaving || !value}
        onClick={submit}
        className="w-full rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
      >
        記録する
      </button>
      {message && <p className="mt-2 text-center text-[11px] text-bone-muted">{message}</p>}
    </div>
  );
}
