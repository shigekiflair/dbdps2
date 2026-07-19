"use client";

import { useState, useTransition } from "react";
import { savePlanProgress } from "@/app/plans/actions";

type Item = { id: string; name: string };

export function PerkConquestTool({
  plan,
  items,
  initialChecked,
}: {
  plan: { slug: string };
  items: Item[];
  initialChecked: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const [drawn, setDrawn] = useState<Item | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [, startSaving] = useTransition();

  const done = checked.size;
  const total = items.length;
  const remaining = items.filter((it) => !checked.has(it.id));

  function save(nextChecked: Set<string>) {
    startSaving(() => savePlanProgress(plan.slug, Array.from(nextChecked)));
  }

  function draw() {
    if (spinning || remaining.length === 0) return;
    setSpinning(true);
    window.setTimeout(() => {
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      const next = new Set(checked);
      next.add(pick.id);
      setChecked(next);
      setDrawn(pick);
      setSpinning(false);
      save(next);
    }, 700);
  }

  // 手動でのチェック付け外し（記録漏れの修正用）
  function toggleManual(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    save(next);
  }

  function reset() {
    if (checked.size === 0) return;
    if (!window.confirm(`達成状況をリセットします（${checked.size}件のチェックが消えます）。よろしいですか？`)) return;
    setChecked(new Set());
    setDrawn(null);
    save(new Set());
  }

  const complete = total > 0 && done === total;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-bone-muted">達成状況</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-bone">
            {done} / {total}
          </p>
          <button
            onClick={reset}
            className="text-[11px] text-bone-muted underline disabled:opacity-40"
            disabled={done === 0}
          >
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

      {!complete && (
        <>
          <div className="mb-4 flex justify-center">
            <div
              key={drawn?.id ?? "empty"}
              className={`w-full max-w-xs rounded-lg border p-6 text-center border-[#2C2C2A] bg-ash2 ${
                spinning ? "tf-card-spinning" : "tf-card-settle"
              }`}
            >
              <div className="mx-auto mb-3 h-10 w-10 rounded bg-ash" />
              <p className="text-sm text-bone">
                {spinning ? "…" : drawn?.name ?? "まだ引いていません"}
              </p>
            </div>
          </div>

          <div className="mb-6 flex justify-center">
            <button
              disabled={spinning}
              onClick={draw}
              className="rounded-lg bg-blood px-6 py-2 text-sm text-white disabled:opacity-60"
            >
              未使用のパークを1つ引く
            </button>
          </div>
        </>
      )}

      {complete && (
        <p className="mb-6 text-center text-sm font-medium text-blood">
          🎉 全パーク制覇達成！耐久企画クリアです。
        </p>
      )}

      <p className="mb-2 text-[11px] text-bone-muted">
        全一覧（記録漏れがあれば手動でタップして修正できます）
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleManual(item.id)}
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
    </div>
  );
}
