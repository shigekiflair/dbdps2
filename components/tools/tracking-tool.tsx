"use client";

import { useState, useTransition } from "react";
import { savePlanProgress } from "@/app/plans/actions";

type Item = { id: string; name: string };

export function TrackingTool({
  plan,
  items,
  initialChecked,
}: {
  plan: { slug: string };
  items: Item[];
  initialChecked: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const [isSaving, startSaving] = useTransition();

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    setChecked(next);
    startSaving(() => savePlanProgress(plan.slug, Array.from(next)));
  }

  function reset() {
    if (checked.size === 0) return;
    if (!window.confirm(`達成状況をリセットします（${checked.size}件のチェックが消えます）。よろしいですか？`)) return;
    setChecked(new Set());
    startSaving(() => savePlanProgress(plan.slug, []));
  }

  const done = checked.size;
  const total = items.length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-bone-muted">達成状況</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-bone">
            {done} / {total}
          </p>
          <button onClick={reset} className="text-[11px] text-bone-muted underline disabled:opacity-40" disabled={done === 0}>
            リセット
          </button>
        </div>
      </div>
      <div className="mb-4 h-2 rounded-full bg-ash2">
        <div
          className="h-2 rounded-full bg-blood transition-all"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`rounded-lg border p-3 text-left text-xs transition-colors ${
              checked.has(item.id)
                ? "border-blood bg-blood-dark text-[#F5C4B3]"
                : "border-[#2C2C2A] bg-ash text-bone"
            }`}
          >
            {checked.has(item.id) ? "✓ " : ""}
            {item.name}
          </button>
        ))}
      </div>

      {total > 0 && done === total && (
        <p className="mt-4 text-center text-xs text-blood">全達成！耐久企画クリアです。</p>
      )}
      {isSaving && <p className="mt-2 text-[10px] text-bone-muted">保存中…</p>}
    </div>
  );
}
