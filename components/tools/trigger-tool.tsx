"use client";

import { useState, useTransition } from "react";
import { sharePlanResult } from "@/app/plans/actions";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * イベントトリガー型（配信者内・軽量トリガー）の専用UI。
 * 「試合中の特定状況で配信者自身がボタンを押して開示する」という使い方が肝なので、
 * 抽選演出は最小限にし、大きな1つのボタンで即座に結果を出すことを優先する。
 * セリフガチャ・お告げガチャ等、customPoolの文字列配列を1件ずつ開示する企画で使う。
 */
export function TriggerTool({ plan, items }: { plan: { slug: string }; items: string[] }) {
  const [bag, setBag] = useState<string[]>(() => shuffle(items));
  const [current, setCurrent] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reveal() {
    if (items.length === 0) return;
    setErrorMessage(null);

    let nextBag = bag;
    if (nextBag.length === 0) {
      // 全件出し切ったら山札をリセット。直前に出たものが連続で出ないよう軽く調整する
      nextBag = shuffle(items);
      if (nextBag.length > 1 && nextBag[0] === current) {
        [nextBag[0], nextBag[1]] = [nextBag[1], nextBag[0]];
      }
    }
    const [next, ...rest] = nextBag;
    setCurrent(next);
    setBag(rest);
    setRevealedCount((c) => c + 1);
    setShareCode(null);
  }

  function publishToOverlay() {
    if (!current) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const code = await sharePlanResult(plan.slug, [{ id: current, name: current, iconUrl: null }]);
        setShareCode(code);
      } catch (err) {
        console.error(err);
        setErrorMessage("OBSリンクの発行に失敗しました。もう一度お試しください。");
      }
    });
  }

  function copyUrl() {
    if (!shareCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/overlay/${shareCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (items.length === 0) {
    return <p className="text-xs text-bone-muted">この企画にはまだ開示できる項目が登録されていません。</p>;
  }

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      <div
        key={current ?? "empty"}
        className="tf-card-settle mb-4 flex min-h-[110px] items-center justify-center rounded-lg border border-[#2C2C2A] bg-ash p-6 text-center"
      >
        <p className="text-sm leading-relaxed text-bone">
          {current ?? "配信中、該当のシーンになったらボタンを押して開示してください"}
        </p>
      </div>

      <button onClick={reveal} className="w-full rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB]">
        {current ? "次を開示する" : "開示する"}
      </button>

      {current && (
        <p className="mt-3 text-center text-[11px] text-bone-muted">
          {revealedCount}回開示済み（全{items.length}件・出し切るまで重複しません）
        </p>
      )}

      {current && (
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-bone-muted">
          <button disabled={isPending} onClick={publishToOverlay} className="underline disabled:opacity-60">
            OBS常時表示リンクを発行
          </button>
          {shareCode && (
            <button onClick={copyUrl} className="underline">
              {copied ? "コピーしました" : "リンクをコピー"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
