"use client";

import { useState, useTransition } from "react";
import { drawPlanResult, sharePlanResult } from "@/app/plans/actions";

type Perk = { id: string; name: string; iconUrl: string | null };

type LotteryPlan = {
  slug: string;
  target: string;
  inputFields: { key: string; label: string; type: string; options?: string[] }[] | null;
  defaultCount: number;
};

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function LotteryTool({ plan }: { plan: LotteryPlan }) {
  const [results, setResults] = useState<Perk[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<"survivor" | "killer">(plan.target === "killer" ? "killer" : "survivor");
  const [count, setCount] = useState(plan.defaultCount);
  const [isPending, startTransition] = useTransition();
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isSharing, startSharing] = useTransition();
  const [copiedTarget, setCopiedTarget] = useState<"share" | "overlay" | null>(null);

  const hasRoleInput = plan.inputFields?.some((f) => f.key === "role") ?? false;
  const countField = plan.inputFields?.find((f) => f.key === "count");
  const countOptions = countField?.options?.map(Number) ?? [];
  const gridColsClass = GRID_COLS[count] ?? "grid-cols-4";

  function selectRole(r: "survivor" | "killer") {
    setRole(r);
    // ロールによってパークのプールが異なるため、前のロールの結果を持ち越さない
    setResults([]);
    setHasDrawn(false);
    setLocked(new Set());
    setShareCode(null);
  }

  function selectCount(c: number) {
    setCount(c);
    setResults([]);
    setHasDrawn(false);
    setLocked(new Set());
    setShareCode(null);
  }

  function draw(resetAll: boolean) {
    startTransition(async () => {
      const kept = resetAll ? [] : results.filter((r) => locked.has(r.id));
      const excludeIds = resetAll ? [] : kept.map((r) => r.id);
      const need = count - kept.length;

      const drawn = (await drawPlanResult(plan.slug, { role, excludeIds, count: need })) as Perk[];
      setResults([...kept, ...drawn]);
      setHasDrawn(true);
      if (resetAll) setLocked(new Set());
      setShareCode(null); // 結果が変わったら発行済みの共有コードは無効化する
    });
  }

  function toggleLock(id: string) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleShareResult() {
    startSharing(async () => {
      const code = await sharePlanResult(plan.slug, results);
      setShareCode(code);
    });
  }

  function copyUrl(target: "share" | "overlay") {
    if (!shareCode) return;
    const path = target === "share" ? `/share/${shareCode}` : `/overlay/${shareCode}`;
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 1500);
  }

  return (
    <div>
      {hasRoleInput && (
        <div className="mb-4 flex gap-2">
          {(["survivor", "killer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => selectRole(r)}
              className={`rounded-full px-3 py-1.5 text-[11px] ${
                role === r ? "bg-blood text-[#FCEBEB]" : "border border-[#2C2C2A] text-bone-muted"
              }`}
            >
              {r === "survivor" ? "サバイバー" : "キラー"}
            </button>
          ))}
        </div>
      )}

      {countField && (
        <div className="mb-4 flex gap-2">
          {countOptions.map((c) => (
            <button
              key={c}
              onClick={() => selectCount(c)}
              className={`rounded-full px-3 py-1.5 text-[11px] ${
                count === c ? "bg-blood text-[#FCEBEB]" : "border border-[#2C2C2A] text-bone-muted"
              }`}
            >
              {c}人
            </button>
          ))}
        </div>
      )}

      {hasDrawn && results.length === 0 ? (
        <div className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash p-4 text-center">
          <p className="text-xs text-bone-muted">条件に該当するパークが見つかりませんでした</p>
        </div>
      ) : (
        <div className={`mb-4 grid ${gridColsClass} gap-2`}>
          {results.length === 0
            ? Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[#2C2C2A] bg-ash p-3 text-center">
                  <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash2" />
                  <p className="text-[11px] text-bone-muted">?</p>
                </div>
              ))
            : results.map((perk) => (
                <button
                  key={perk.id}
                  onClick={() => toggleLock(perk.id)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    locked.has(perk.id) ? "border-blood" : "border-[#2C2C2A]"
                  } bg-ash`}
                >
                  <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash2" />
                  <p className="text-[11px] text-bone">{perk.name}</p>
                  {locked.has(perk.id) && <p className="mt-1 text-[10px] text-blood">固定中</p>}
                </button>
              ))}
        </div>
      )}

      <p className="mb-3 text-[11px] text-bone-muted">
        カードをタップすると固定できます。固定したものはそのままで、残りだけ引き直せます。
      </p>

      <div className="mb-3 flex gap-2">
        <button
          disabled={isPending}
          onClick={() => draw(results.length === 0)}
          className="flex-1 rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
        >
          {isPending ? "抽選中…" : results.length === 0 ? "抽選する" : "固定以外を回す"}
        </button>
        {results.length > 0 && (
          <button
            disabled={isPending}
            onClick={() => draw(true)}
            className="rounded-lg border border-[#2C2C2A] px-4 text-xs text-bone-muted disabled:opacity-60"
          >
            全部やり直す
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-[#2C2C2A] bg-ash p-3">
          {!shareCode ? (
            <button
              disabled={isSharing}
              onClick={handleShareResult}
              className="w-full rounded-md border border-[#2C2C2A] py-2 text-xs text-bone disabled:opacity-60"
            >
              {isSharing ? "発行中…" : "この結果を共有する（OBS表示用リンクも発行）"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-bone-muted">共有ページ</span>
                <button onClick={() => copyUrl("share")} className="text-[11px] text-bone underline">
                  {copiedTarget === "share" ? "コピーしました" : "リンクをコピー"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-bone-muted">OBSオーバーレイ</span>
                <button onClick={() => copyUrl("overlay")} className="text-[11px] text-bone underline">
                  {copiedTarget === "overlay" ? "コピーしました" : "リンクをコピー"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
