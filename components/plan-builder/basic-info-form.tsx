"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBasicPlanInfo } from "@/app/plans/[slug]/edit/basic-info-actions";

/**
 * poolConfigに設定項目が無い(または今はまだ専用エディタが無い)運営企画向けの、
 * タイトル・説明文だけを編集する最小限のフォーム。
 */
export function BasicInfoForm({
  slug,
  initialTitle,
  initialDescription,
}: {
  slug: string;
  initialTitle: string;
  initialDescription: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateBasicPlanInfo({ slug, title, description });
      if (result.error || !result.slug) {
        setErrorMessage(result.error ?? "保存に失敗しました。");
        return;
      }
      router.push(`/plans/${result.slug}?updated=1`);
    });
  }

  return (
    <div>
      <p className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone-muted">
        この企画は抽選内容が固定のロジックで動いているため、編集できるのはタイトルと説明文だけです。
      </p>

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

      <label className="mb-5 block">
        <span className="mb-1 block text-xs text-bone-muted">説明（視聴者にも表示されます）</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
        />
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
