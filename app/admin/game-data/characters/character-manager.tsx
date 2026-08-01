"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCharacterAction, updateCharacterAction } from "../actions";

type Character = {
  id: string;
  slug: string;
  name: string;
  role: "killer" | "survivor";
  chapter: string | null;
  iconUrl: string | null;
};

const EMPTY_DRAFT = { slug: "", name: "", role: "killer" as "killer" | "survivor", chapter: "", iconUrl: "" };

function CharacterFormFields({
  draft,
  setDraft,
}: {
  draft: typeof EMPTY_DRAFT;
  setDraft: (d: typeof EMPTY_DRAFT) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        value={draft.slug}
        onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
        placeholder="slug（半角英数-のみ、例: the-houndmaster）"
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="名前（例: ハウンドマスター）"
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <select
        value={draft.role}
        onChange={(e) => setDraft({ ...draft, role: e.target.value as "killer" | "survivor" })}
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone"
      >
        <option value="killer">キラー</option>
        <option value="survivor">サバイバー</option>
      </select>
      <input
        value={draft.chapter}
        onChange={(e) => setDraft({ ...draft, chapter: e.target.value })}
        placeholder="チャプター/DLC名（任意）"
        className="rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
      <input
        value={draft.iconUrl}
        onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
        placeholder="アイコンURL（任意、未設定なら仮アイコン表示）"
        className="sm:col-span-2 rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
      />
    </div>
  );
}

function CharacterRow({ character }: { character: Character }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    slug: character.slug,
    name: character.name,
    role: character.role,
    chapter: character.chapter ?? "",
    iconUrl: character.iconUrl ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateCharacterAction(character.id, draft);
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
            {character.name} <span className="text-[10px] text-bone-muted">({character.role === "killer" ? "キラー" : "サバイバー"})</span>
          </p>
          <p className="text-[10px] text-bone-muted">
            {character.slug}
            {character.chapter && ` ・ ${character.chapter}`}
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
      <CharacterFormFields draft={draft} setDraft={setDraft} />
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

export function CharacterManager({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createCharacterAction(draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setDraft(EMPTY_DRAFT);
      router.refresh();
    });
  }

  const killers = characters.filter((c) => c.role === "killer");
  const survivors = characters.filter((c) => c.role === "survivor");

  return (
    <div>
      <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <summary className="cursor-pointer text-xs font-medium text-bone">+ 新しいキャラクターを追加</summary>
        <div className="mt-3">
          <CharacterFormFields draft={draft} setDraft={setDraft} />
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

      <p className="mb-2 text-xs font-medium text-bone">キラー（{killers.length}）</p>
      <div className="mb-6 space-y-2">
        {killers.map((c) => (
          <CharacterRow key={c.id} character={c} />
        ))}
      </div>

      <p className="mb-2 text-xs font-medium text-bone">サバイバー（{survivors.length}）</p>
      <div className="space-y-2">
        {survivors.map((c) => (
          <CharacterRow key={c.id} character={c} />
        ))}
      </div>
    </div>
  );
}
