"use client";

import { useState, useTransition } from "react";
import { updatePlanGenreTags } from "@/app/plans/[slug]/edit/genre-tag-actions";

type Tag = { id: string; slug: string; label: string; color: string | null };

/**
 * 企画のジャンルタグ(対人系/心理戦系/収集系等)を編集する独立ブロック。
 * タイトル・説明文などの内容編集とは別のサーバーアクションで動くので、
 * どの企画タイプの編集フォームにもそのまま埋め込める。
 */
export function GenreTagPicker({
  slug,
  allTags,
  initialTagIds,
}: {
  slug: string;
  allTags: Tag[];
  initialTagIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialTagIds));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function toggle(tagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await updatePlanGenreTags({ slug, tagIds: Array.from(selected) });
      if (result.error) {
        setMessage({ text: result.error, isError: true });
        return;
      }
      setMessage({ text: "ジャンルタグを保存しました。", isError: false });
    });
  }

  return (
    <div className="mt-6 border-t border-[#2C2C2A] pt-4">
      <p className="mb-1.5 text-xs text-bone-muted">
        ジャンルタグ（企画一覧での絞り込み・カード表示に使われます・複数選択可）
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {allTags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              selected.has(t.id) ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] text-bone-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
        {allTags.length === 0 && <p className="text-[11px] text-bone-muted">登録されているジャンルタグがありません。</p>}
      </div>

      {message && (
        <p className={`mb-2 text-[11px] ${message.isError ? "text-[#F5C4B3]" : "text-bone-muted"}`}>{message.text}</p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={save}
        className="rounded-lg border border-[#2C2C2A] px-4 py-2 text-[11px] font-medium text-bone disabled:opacity-60"
      >
        ジャンルタグを保存
      </button>
    </div>
  );
}
