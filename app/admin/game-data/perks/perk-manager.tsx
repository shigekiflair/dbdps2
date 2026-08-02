"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPerkAction, updatePerkAction } from "../actions";
import { Field } from "@/components/game-data/field";

type Perk = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role: "killer" | "survivor";
  originCharacterId: string | null;
  iconUrl: string | null;
  isActive: boolean;
};
type CharacterOption = { id: string; name: string; role: "killer" | "survivor" };

const emptyDraft = () => ({
  slug: "",
  name: "",
  description: "",
  role: "killer" as "killer" | "survivor",
  originCharacterId: "",
  iconUrl: "",
  isActive: true,
});
type Draft = ReturnType<typeof emptyDraft>;

function PerkFormFields({
  draft,
  setDraft,
  characters,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  characters: CharacterOption[];
}) {
  const candidateCharacters = characters.filter((c) => c.role === draft.role);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label="管理用の名前（半角の英字・数字・ハイフンだけを使った、他と被らない名前）">
        <input
          value={draft.slug}
          onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          placeholder="blood-pact"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
      <Field label="名前">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="血の絆"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
      <Field label="キラー用・サバイバー用のどちらか">
        <select
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value as "killer" | "survivor", originCharacterId: "" })}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
        >
          <option value="killer">キラー用</option>
          <option value="survivor">サバイバー用</option>
        </select>
      </Field>
      <Field label="固有キャラ（コラボ終了時はここを「共通パーク」に変更）">
        <select
          value={draft.originCharacterId}
          onChange={(e) => setDraft({ ...draft, originCharacterId: e.target.value })}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
        >
          <option value="">共通パーク（固有キャラなし）</option>
          {candidateCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}の固有パーク
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="効果の説明（任意）">
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="効果の内容を入力"
            rows={2}
            className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="アイコン画像のURL（任意）">
          <input
            value={draft.iconUrl}
            onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
            placeholder="/perks/blood-pact.png"
            className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-bone-muted">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
        現行バージョンで使用可能（廃止された場合はオフ）
      </label>
    </div>
  );
}

function PerkRow({ perk, characters }: { perk: Perk; characters: CharacterOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    slug: perk.slug,
    name: perk.name,
    description: perk.description ?? "",
    role: perk.role,
    originCharacterId: perk.originCharacterId ?? "",
    iconUrl: perk.iconUrl ?? "",
    isActive: perk.isActive,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const originName = characters.find((c) => c.id === perk.originCharacterId)?.name;

  function save() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updatePerkAction(perk.id, draft);
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
          <p className="text-sm text-bone">
            {perk.name}
            {!perk.isActive && <span className="ml-2 text-[10px] text-[#ff8080]">（廃止）</span>}
          </p>
          <p className="text-[10px] text-bone-muted">{originName ? `${originName}の固有パーク` : "共通パーク"}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-[11px] text-bone-muted underline">
          編集
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bone bg-ash p-3">
      <PerkFormFields draft={draft} setDraft={setDraft} characters={characters} />
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

export function PerkManager({ perks, characters }: { perks: Perk[]; characters: CharacterOption[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createPerkAction(draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setDraft(emptyDraft());
      router.refresh();
    });
  }

  const killerPerks = perks.filter((p) => p.role === "killer");
  const survivorPerks = perks.filter((p) => p.role === "survivor");

  return (
    <div>
      <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <summary className="cursor-pointer text-xs font-medium text-bone">+ 新しいパークを追加</summary>
        <div className="mt-3">
          <PerkFormFields draft={draft} setDraft={setDraft} characters={characters} />
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

      <p className="mb-2 text-xs font-medium text-bone">キラー用（{killerPerks.length}）</p>
      <div className="mb-6 space-y-2">
        {killerPerks.map((p) => (
          <PerkRow key={p.id} perk={p} characters={characters} />
        ))}
      </div>

      <p className="mb-2 text-xs font-medium text-bone">サバイバー用（{survivorPerks.length}）</p>
      <div className="space-y-2">
        {survivorPerks.map((p) => (
          <PerkRow key={p.id} perk={p} characters={characters} />
        ))}
      </div>
    </div>
  );
}
