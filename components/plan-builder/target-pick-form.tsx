"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTargetPickPlan } from "@/app/plans/[slug]/edit/target-pick-actions";

export function TargetPickPlanForm({
  slug,
  initialTitle,
  initialDescription,
  initialItems,
}: {
  slug: string;
  initialTitle: string;
  initialDescription: string;
  initialItems: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [itemsText, setItemsText] = useState(initialItems.join("\n"));
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateTargetPickPlan({
        slug,
        title,
        description,
        items: itemsText.split("\n"),
      });
      if (result.error || !result.slug) {
        setErrorMessage(result.error ?? "保存に失敗しました。");
        return;
      }
      router.push(`/plans/${result.slug}?updated=1`);
    });
  }

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-bone-muted">タイトル</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-bone-muted">説明（視聴者にも表示されます）</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-bone-muted">指名する候補（1行1件、ランダムに1つ選ばれます）</span>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={6}
          placeholder="1行に1件ずつ入力してください"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
        />
        <span className="mt-1 block text-[11px] text-bone-muted">
          新しい行を追加すれば候補を増やせます。既存の行を消せば候補を減らせます。
        </span>
      </label>

      <button
        disabled={isPending}
        onClick={submit}
        className="rounded-lg bg-blood px-5 py-2.5 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
      >
        更新する
      </button>
    </div>
  );
}
