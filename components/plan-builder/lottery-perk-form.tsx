"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLotteryPerkPoolPlan } from "@/app/plans/[slug]/edit/lottery-perk-actions";

type Tag = { id: string; slug: string; label: string; color: string | null };

function TagPicker({
  tags,
  selected,
  onToggle,
}: {
  tags: Tag[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onToggle(t.slug)}
          className={`rounded-full border px-2.5 py-1 text-[11px] ${
            selected.has(t.slug) ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] text-bone-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
      {tags.length === 0 && <p className="text-[11px] text-bone-muted">登録されているタグがありません。</p>}
    </div>
  );
}

export function LotteryPerkPoolForm({
  slug,
  tags,
  initialTitle,
  initialDescription,
  initialFilterTags,
  initialExcludeTags,
  initialCount,
}: {
  slug: string;
  tags: Tag[];
  initialTitle: string;
  initialDescription: string;
  initialFilterTags: string[];
  initialExcludeTags: string[];
  initialCount: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set(initialFilterTags));
  const [excludeTags, setExcludeTags] = useState<Set<string>>(new Set(initialExcludeTags));
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleFilterTag(tagSlug: string) {
    setFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagSlug)) next.delete(tagSlug);
      else next.add(tagSlug);
      return next;
    });
  }
  function toggleExcludeTag(tagSlug: string) {
    setExcludeTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagSlug)) next.delete(tagSlug);
      else next.add(tagSlug);
      return next;
    });
  }

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateLotteryPerkPoolPlan({
        slug,
        title,
        description,
        filterTags: Array.from(filterTags),
        excludeTags: Array.from(excludeTags),
        count,
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
      <p className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone-muted">
        タグの付いたパークの中から、条件に合うものだけを抽選対象にする企画です。
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

      <label className="mb-4 block">
        <span className="mb-1 block text-xs text-bone-muted">説明（視聴者にも表示されます）</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
        />
      </label>

      <div className="mb-4">
        <p className="mb-1.5 text-xs text-bone-muted">
          対象タグ（<span className="text-bone">いずれか1つでも</span>付いているパークが抽選対象になります）
        </p>
        <TagPicker tags={tags} selected={filterTags} onToggle={toggleFilterTag} />
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-xs text-bone-muted">
          除外タグ（このタグが付いているパークは<span className="text-bone">抽選対象から外されます</span>・任意）
        </p>
        <TagPicker tags={tags} selected={excludeTags} onToggle={toggleExcludeTag} />
      </div>

      <label className="mb-5 block max-w-[160px]">
        <span className="mb-1 block text-xs text-bone-muted">何枚抽選するか</span>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(Number(e.target.value) || 1)}
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
