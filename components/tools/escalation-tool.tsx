"use client";

import { useState, useTransition } from "react";
import { savePlanProgressPayload } from "@/app/plans/actions";

export function EscalationTool({
  plan,
  rulePool,
  threshold,
  initialPoints,
  initialTriggeredIndices,
}: {
  plan: { slug: string };
  rulePool: string[];
  threshold: number;
  initialPoints: number;
  initialTriggeredIndices: number[];
}) {
  const [points, setPoints] = useState(initialPoints);
  const [triggered, setTriggered] = useState<number[]>(initialTriggeredIndices);
  const [rolling, setRolling] = useState(false);
  const [justTriggeredIndex, setJustTriggeredIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const remainingPool = rulePool.map((rule, i) => ({ rule, i })).filter(({ i }) => !triggered.includes(i));
  const pointsIntoCycle = points % threshold;
  const pointsUntilNext = pointsIntoCycle === 0 && points > 0 ? threshold : threshold - pointsIntoCycle;

  function save(nextPoints: number, nextTriggered: number[]) {
    startTransition(() =>
      savePlanProgressPayload(plan.slug, { points: nextPoints, triggeredIndices: nextTriggered })
    );
  }

  function addPenalty() {
    if (rolling) return;
    const nextPoints = points + 1;

    if (nextPoints % threshold === 0 && remainingPool.length > 0) {
      setRolling(true);
      setPoints(nextPoints);
      window.setTimeout(() => {
        const pick = remainingPool[Math.floor(Math.random() * remainingPool.length)];
        const nextTriggered = [...triggered, pick.i];
        setTriggered(nextTriggered);
        setJustTriggeredIndex(pick.i);
        setRolling(false);
        save(nextPoints, nextTriggered);
        window.setTimeout(() => setJustTriggeredIndex(null), 1200);
      }, 900);
    } else {
      setPoints(nextPoints);
      save(nextPoints, triggered);
    }
  }

  function reset() {
    if (points === 0 && triggered.length === 0) return;
    if (!window.confirm("献身ポイントと発動済みルールをすべてリセットします。よろしいですか？")) return;
    setPoints(0);
    setTriggered([]);
    save(0, []);
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-[11px] text-bone-muted">現在の献身ポイント</p>
        <p className="text-3xl font-semibold text-bone">{points}</p>
        {remainingPool.length > 0 && (
          <p className="mt-1 text-[11px] text-bone-muted">
            あと{pointsUntilNext}ptでルーレット発動（{threshold}ptごと）
          </p>
        )}
      </div>

      <div className="mb-4 flex justify-center">
        <button
          disabled={rolling}
          onClick={addPenalty}
          className="rounded-lg bg-blood px-6 py-2 text-sm text-white disabled:opacity-60"
        >
          ペナルティ発生（+1pt）
        </button>
      </div>

      {rolling && (
        <div className="mb-4 flex justify-center">
          <div className="tf-card-spinning w-full max-w-xs rounded-lg border border-[#2C2C2A] bg-ash2 p-4 text-center">
            <p className="text-xs text-bone">…</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] text-bone-muted">
          発動中のルール（{triggered.length}/{rulePool.length}・一度発動したら以後ずっと有効）
        </p>
        {triggered.length === 0 && !rolling ? (
          <p className="text-xs text-bone-muted">まだ何も発動していません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {triggered.map((i) => (
              <div
                key={i}
                className={`rounded-lg border border-blood bg-blood-dark p-3 text-left text-xs text-[#F5C4B3] ${
                  justTriggeredIndex === i ? "tf-card-settle" : ""
                }`}
              >
                {rulePool[i]}
              </div>
            ))}
          </div>
        )}
      </div>

      {remainingPool.length === 0 && triggered.length > 0 && (
        <p className="mt-4 text-center text-xs text-blood">
          プールを使い切りました！これ以上のエスカレーションはありません。
        </p>
      )}

      <div className="mt-4 text-center">
        <button onClick={reset} className="text-[11px] text-bone-muted underline">
          リセット（次の配信用）
        </button>
      </div>
    </div>
  );
}
