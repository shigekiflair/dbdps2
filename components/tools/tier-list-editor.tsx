"use client";

import { useEffect, useState } from "react";

type Tier = { id: string; label: string; color: string };
type Killer = { id: string; name: string };

const DEFAULT_TIERS: Tier[] = [
  { id: "s", label: "S", color: "#C4342F" },
  { id: "a", label: "A", color: "#BA7517" },
  { id: "b", label: "B", color: "#D4C24A" },
  { id: "c", label: "C", color: "#2B7A68" },
  { id: "d", label: "D", color: "#5A6B8C" },
];

const SWATCHES = ["#C4342F", "#BA7517", "#D4C24A", "#2B7A68", "#5A6B8C", "#8C5AA0", "#888780"];

function newTierId() {
  return `tier-${Math.random().toString(36).slice(2, 8)}`;
}

export function TierListEditor({
  killers,
  initialTiers,
  initialAssignments,
  onChange,
}: {
  killers: Killer[];
  initialTiers?: Tier[];
  initialAssignments?: Record<string, string>;
  onChange: (tiers: Tier[], assignments: Record<string, string>) => void;
}) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers?.length ? initialTiers : DEFAULT_TIERS);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments ?? {});
  const [selectedKiller, setSelectedKiller] = useState<string | null>(null);
  const [killerQuery, setKillerQuery] = useState("");
  const [dragOverTier, setDragOverTier] = useState<string | null>(null);

  // マウント時点のデフォルト状態(S/A/B/C/D)を親に伝える。何も操作せず保存しても
  // 空のtiersにならないようにするため
  useEffect(() => {
    onChange(tiers, assignments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(nextTiers: Tier[], nextAssignments: Record<string, string>) {
    setTiers(nextTiers);
    setAssignments(nextAssignments);
    onChange(nextTiers, nextAssignments);
  }

  function assign(killerId: string, tierId: string | null) {
    const next = { ...assignments };
    if (tierId) next[killerId] = tierId;
    else delete next[killerId];
    commit(tiers, next);
    setSelectedKiller(null);
  }

  // --- タップで割り当て（モバイル向けフォールバック） ---
  function handleChipTap(killerId: string) {
    setSelectedKiller((prev) => (prev === killerId ? null : killerId));
  }
  function handleTierTap(tierId: string) {
    if (selectedKiller) assign(selectedKiller, tierId);
  }

  // --- 本格的なドラッグ&ドロップ（デスクトップ向け） ---
  function handleDragStart(e: React.DragEvent, killerId: string) {
    e.dataTransfer.setData("text/plain", killerId);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e: React.DragEvent, tierId: string | null) {
    e.preventDefault();
    setDragOverTier(null);
    const killerId = e.dataTransfer.getData("text/plain");
    if (killerId) assign(killerId, tierId);
  }

  function addTier() {
    if (tiers.length >= 10) return;
    commit([...tiers, { id: newTierId(), label: "New", color: "#888780" }], assignments);
  }
  function removeTier(tierId: string) {
    const nextAssignments = { ...assignments };
    for (const k of Object.keys(nextAssignments)) {
      if (nextAssignments[k] === tierId) delete nextAssignments[k];
    }
    commit(
      tiers.filter((t) => t.id !== tierId),
      nextAssignments
    );
  }
  function updateTierLabel(tierId: string, label: string) {
    commit(
      tiers.map((t) => (t.id === tierId ? { ...t, label } : t)),
      assignments
    );
  }
  function updateTierColor(tierId: string, color: string) {
    commit(
      tiers.map((t) => (t.id === tierId ? { ...t, color } : t)),
      assignments
    );
  }
  function moveTier(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next, assignments);
  }

  const unranked = killers.filter((k) => !assignments[k.id]);

  return (
    <div>
      <p className="mb-3 text-[11px] text-bone-muted">
        キラーをドラッグ&ドロップでランクに振り分けてください（スマホの場合はキラーをタップ→ランクをタップで割り当てできます）
      </p>

      <div className="space-y-2">
        {tiers.map((tier, index) => (
          <div
            key={tier.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverTier(tier.id);
            }}
            onDragLeave={() => setDragOverTier((prev) => (prev === tier.id ? null : prev))}
            onDrop={(e) => handleDrop(e, tier.id)}
            onClick={() => handleTierTap(tier.id)}
            className={`flex overflow-hidden rounded-lg border ${
              dragOverTier === tier.id ? "border-bone" : "border-[#2C2C2A]"
            }`}
          >
            <div
              className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 p-2"
              style={{ backgroundColor: tier.color }}
            >
              <input
                value={tier.label}
                onChange={(e) => updateTierLabel(tier.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded bg-black/20 px-1 text-center text-sm font-bold text-white"
              />
              <div className="flex gap-1">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTierColor(tier.id, c);
                    }}
                    className="h-3 w-3 rounded-full border border-white/40"
                    style={{ backgroundColor: c }}
                    aria-label={`色を${c}にする`}
                  />
                ))}
              </div>
            </div>
            <div className="flex min-h-[52px] flex-1 flex-wrap items-center gap-2 bg-ash p-2">
              {Object.entries(assignments)
                .filter(([, tierId]) => tierId === tier.id)
                .map(([killerId]) => {
                  const killer = killers.find((k) => k.id === killerId);
                  if (!killer) return null;
                  return (
                    <span
                      key={killerId}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, killerId);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChipTap(killerId);
                      }}
                      className={`cursor-grab rounded-md border px-2 py-1 text-xs text-bone active:cursor-grabbing ${
                        selectedKiller === killerId ? "border-bone bg-ash2" : "border-[#2C2C2A] bg-ash2"
                      }`}
                    >
                      {killer.name}
                    </span>
                  );
                })}
            </div>
            <div className="flex flex-col justify-center gap-1 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveTier(index, -1);
                }}
                className="text-[10px] text-bone-muted"
                aria-label="上に移動"
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveTier(index, 1);
                }}
                className="text-[10px] text-bone-muted"
                aria-label="下に移動"
              >
                ▼
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTier(tier.id);
                }}
                className="text-[10px] text-bone-muted"
                aria-label="ランクを削除"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addTier} className="mt-2 text-[11px] text-bone-muted underline">
        + ランクを追加
      </button>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverTier("unranked");
        }}
        onDragLeave={() => setDragOverTier((prev) => (prev === "unranked" ? null : prev))}
        onDrop={(e) => handleDrop(e, null)}
        onClick={() => {
          if (selectedKiller) assign(selectedKiller, null);
        }}
        className={`mt-4 rounded-lg border border-dashed p-3 ${
          dragOverTier === "unranked" ? "border-bone" : "border-[#2C2C2A]"
        }`}
      >
        <p className="mb-2 text-[11px] text-bone-muted">未振り分け（ここにドロップで解除）</p>
        <input
          value={killerQuery}
          onChange={(e) => setKillerQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="キャラ名で検索"
          className="mb-2 w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-1.5 text-xs text-bone placeholder:text-bone-muted"
        />
        <div className="flex flex-wrap gap-2">
          {unranked
            .filter((k) => k.name.toLowerCase().includes(killerQuery.trim().toLowerCase()))
            .map((k) => (
              <span
                key={k.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(e, k.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChipTap(k.id);
                }}
                className={`cursor-grab rounded-md border px-2 py-1 text-xs active:cursor-grabbing ${
                  selectedKiller === k.id ? "border-bone text-bone" : "border-[#2C2C2A] text-bone-muted"
                }`}
              >
                {k.name}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
