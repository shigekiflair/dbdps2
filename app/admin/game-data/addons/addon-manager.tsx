"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAddonAction, updateAddonAction } from "../actions";

type Rarity = "common" | "uncommon" | "rare" | "very_rare" | "ultra_rare" | "event";
type Addon = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rarity: Rarity;
  iconUrl: string | null;
  killerId: string | null;
  itemId: string | null;
};
type KillerOption = { id: string; name: string };
type ItemOption = { id: string; name: string };

const RARITY_LABEL: Record<Rarity, string> = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  very_rare: "ベリーレア",
  ultra_rare: "アルティメット",
  event: "イベント限定",
};

const emptyDraft = () => ({
  slug: "",
  name: "",
  description: "",
  rarity: "common" as Rarity,
  iconUrl: "",
  killerId: "",
  itemId: "",
});
type Draft = ReturnType<typeof emptyDraft>;

function AddonFormFields({
  draft,
  setDraft,
  killers,
  items,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  killers: KillerOption[];
  items: ItemOption[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        value={draft.slug}
        onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
        placeholder="slug（半角英数-のみ）"
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="名前"
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <select
        value={draft.rarity}
        onChange={(e) => setDraft({ ...draft, rarity: e.target.value as Rarity })}
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
      >
        {Object.entries(RARITY_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <div />
      <select
        value={draft.killerId}
        onChange={(e) => setDraft({ ...draft, killerId: e.target.value, itemId: e.target.value ? "" : draft.itemId })}
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
      >
        <option value="">（キラー用ではない）</option>
        {killers.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}用
          </option>
        ))}
      </select>
      <select
        value={draft.itemId}
        onChange={(e) => setDraft({ ...draft, itemId: e.target.value, killerId: e.target.value ? "" : draft.killerId })}
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
      >
        <option value="">（アイテム用ではない）</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}用
          </option>
        ))}
      </select>
      <textarea
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        placeholder="効果の説明（任意）"
        rows={2}
        className="sm:col-span-2 rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <input
        value={draft.iconUrl}
        onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
        placeholder="アイコンURL（任意）"
        className="sm:col-span-2 rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
    </div>
  );
}

function AddonRow({ addon, killers, items }: { addon: Addon; killers: KillerOption[]; items: ItemOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    slug: addon.slug,
    name: addon.name,
    description: addon.description ?? "",
    rarity: addon.rarity,
    iconUrl: addon.iconUrl ?? "",
    killerId: addon.killerId ?? "",
    itemId: addon.itemId ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetName = killers.find((k) => k.id === addon.killerId)?.name ?? items.find((i) => i.id === addon.itemId)?.name ?? "?";

  function save() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateAddonAction(addon.id, draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[#2C2C2A] bg-ash p-3">
        <div>
          <p className="text-sm text-bone">{addon.name}</p>
          <p className="text-[10px] text-bone-muted">
            {targetName} ・ {RARITY_LABEL[addon.rarity]}
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="text-[11px] text-bone-muted underline">
          編集
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bone bg-ash p-3">
      <AddonFormFields draft={draft} setDraft={setDraft} killers={killers} items={items} />
      {errorMessage && <p className="mt-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
      <div className="mt-2 flex gap-2">
        <button disabled={isPending} onClick={save} className="rounded-md bg-blood px-3 py-1.5 text-[11px] font-medium text-[#FCEBEB] disabled:opacity-50">
          保存する
        </button>
        <button onClick={() => setEditing(false)} className="text-[11px] text-bone-muted">
          キャンセル
        </button>
      </div>
    </div>
  );
}

export function AddonManager({ addons, killers, items }: { addons: Addon[]; killers: KillerOption[]; items: ItemOption[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createAddonAction(draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setDraft(emptyDraft());
      router.refresh();
    });
  }

  const filtered = filter.trim() ? addons.filter((a) => a.name.toLowerCase().includes(filter.trim().toLowerCase())) : [];

  return (
    <div>
      <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <summary className="cursor-pointer text-xs font-medium text-bone">+ 新しいアドオンを追加</summary>
        <div className="mt-3">
          <AddonFormFields draft={draft} setDraft={setDraft} killers={killers} items={items} />
          {errorMessage && <p className="mt-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
          <button
            disabled={isPending}
            onClick={submit}
            className="mt-2 rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-50"
          >
            追加する
          </button>
        </div>
      </details>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`編集したいアドオン名で検索（全${addons.length}件、一覧は出さず検索のみ）`}
        className="mb-3 w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      {filter.trim() && filtered.length === 0 && <p className="text-[11px] text-bone-muted">一致するアドオンがありません。</p>}
      <div className="space-y-2">
        {filtered.map((a) => (
          <AddonRow key={a.id} addon={a} killers={killers} items={items} />
        ))}
      </div>
    </div>
  );
}
