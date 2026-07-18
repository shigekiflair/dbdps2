"use client";

import { useState, useTransition } from "react";
import { drawPlanResult, sharePlanResult } from "@/app/plans/actions";

type Target = { id: string; name: string; iconUrl: string | null };

export function TargetPickTool({ plan }: { plan: { slug: string } }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [locked, setLocked] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<"share" | "overlay" | null>(null);
  const [isPending, startTransition] = useTransition();

  function draw() {
    startTransition(async () => {
      const result = await drawPlanResult(plan.slug, { count: 1 });
      setTarget((result[0] as Target) ?? null);
      setLocked(false);
      setShareCode(null);
    });
  }

  function lockIn() {
    if (!target) return;
    startTransition(async () => {
      const code = await sharePlanResult(plan.slug, [target]);
      setShareCode(code);
      setLocked(true);
    });
  }

  function redo() {
    if (locked && !window.confirm("指名をやり直します。共有中のリンクは新しいものに切り替わります。よろしいですか？")) return;
    setTarget(null);
    setLocked(false);
    setShareCode(null);
  }

  function copyUrl(kind: "share" | "overlay") {
    if (!shareCode) return;
    const path = kind === "share" ? `/share/${shareCode}` : `/overlay/${shareCode}`;
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  const spinning = isPending && !locked;

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <div
          key={target?.id ?? "empty"}
          className={`w-full max-w-xs rounded-lg border p-6 text-center ${
            locked ? "border-blood" : "border-[#2C2C2A]"
          } bg-ash2 ${spinning ? "tf-card-spinning" : "tf-card-settle"}`}
        >
          <div className="mx-auto mb-3 h-16 w-16 rounded bg-ash" />
          <p className="text-sm text-bone">{spinning ? "…" : target?.name ?? "まだ指名していません"}</p>
          {locked && <p className="mt-2 text-[10px] text-blood">指名確定・試合中はこのままロック</p>}
        </div>
      </div>

      <div className="mb-3 flex justify-center gap-2">
        {!target ? (
          <button
            disabled={isPending}
            onClick={draw}
            className="rounded-lg bg-blood px-6 py-2 text-sm text-white disabled:opacity-60"
          >
            指名する
          </button>
        ) : !locked ? (
          <>
            <button
              disabled={isPending}
              onClick={draw}
              className="rounded-lg border border-[#2C2C2A] px-4 py-2 text-xs text-bone-muted disabled:opacity-60"
            >
              指名し直す
            </button>
            <button
              disabled={isPending}
              onClick={lockIn}
              className="rounded-lg bg-blood px-6 py-2 text-sm text-white disabled:opacity-60"
            >
              この対象で確定・試合開始
            </button>
          </>
        ) : (
          <button
            onClick={redo}
            className="rounded-lg border border-[#2C2C2A] px-4 py-2 text-xs text-bone-muted"
          >
            指名をやり直す（次の試合用）
          </button>
        )}
      </div>

      {shareCode && (
        <div className="flex justify-center gap-4 text-[11px] text-bone-muted">
          <button onClick={() => copyUrl("share")} className="underline">
            {copied === "share" ? "コピーしました" : "共有リンク"}
          </button>
          <button onClick={() => copyUrl("overlay")} className="underline">
            {copied === "overlay" ? "コピーしました" : "OBSリンク（常時表示用）"}
          </button>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-bone-muted">
        「確定」を押すとOBS用の常時表示リンクが発行されます。試合中このリンクを配信画面に貼っておけば、視聴者にもターゲットがずっと見える状態になります。
      </p>
    </div>
  );
}
