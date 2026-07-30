"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TierListEditor } from "@/components/tools/tier-list-editor";
import { createTierListPlan, updateTierListPlan } from "@/app/plans/new/actions";

type Tier = { id: string; label: string; color: string };
type Killer = { id: string; name: string; iconUrl?: string | null };

export function TierListPlanForm({
  killers,
  mode = "create",
  slug,
  initialTitle = "",
  initialDescription = "",
  initialVisibility = "unlisted",
  initialTiers,
  initialAssignments,
}: {
  killers: Killer[];
  mode?: "create" | "edit";
  slug?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialVisibility?: "private" | "unlisted" | "public";
  initialTiers?: Tier[];
  initialAssignments?: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [tiers, setTiers] = useState<Tier[]>(initialTiers ?? []);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments ?? {});
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result =
          mode === "edit" && slug
            ? await updateTierListPlan({ slug, title, description, visibility, tiers, assignments })
            : await createTierListPlan({ title, description, visibility, tiers, assignments });
        router.push(mode === "edit" ? `/plans/${result.slug}?updated=1` : `/plans/${result.slug}?created=1`);
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "保存に失敗しました。");
      }
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
          placeholder="例：2026年7月版 キラー使用感ティア表"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-1 block text-xs text-bone-muted">説明（視聴者にも表示されます）</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
        />
      </label>

      <TierListEditor
        killers={killers}
        initialTiers={initialTiers}
        initialAssignments={initialAssignments}
        onChange={(t, a) => {
          setTiers(t);
          setAssignments(a);
        }}
      />

      <div className="mt-5 flex items-end gap-4">
        <label className="block max-w-[240px]">
          <span className="mb-1 block text-xs text-bone-muted">公開範囲</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
          >
            <option value="private">自分だけ</option>
            <option value="unlisted">リンクを知っている人だけ</option>
          </select>
        </label>

        <button
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-blood px-5 py-2.5 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
        >
          {mode === "edit" ? "更新する" : "作成する"}
        </button>
      </div>
    </div>
  );
}
