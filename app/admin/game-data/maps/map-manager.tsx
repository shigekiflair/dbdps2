"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMapAction, updateMapAction } from "../actions";
import { Field } from "@/components/game-data/field";

type MapItem = { id: string; slug: string; name: string; realm: string | null; iconUrl: string | null };

const emptyDraft = () => ({ slug: "", name: "", realm: "", iconUrl: "" });
type Draft = ReturnType<typeof emptyDraft>;

function MapFormFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label="slug（URLに使う識別子。半角英数とハイフンのみ）">
        <input
          value={draft.slug}
          onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          placeholder="the-game"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
      <Field label="マップ名">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="ザ・ゲーム"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
      <Field label="リルム（マップの系統。任意）">
        <input
          value={draft.realm}
          onChange={(e) => setDraft({ ...draft, realm: e.target.value })}
          placeholder="製材所"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
      <Field label="アイコン画像のURL（任意）">
        <input
          value={draft.iconUrl}
          onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
          placeholder="/maps/the-game.png"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
        />
      </Field>
    </div>
  );
}

function MapRow({ map }: { map: MapItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ slug: map.slug, name: map.name, realm: map.realm ?? "", iconUrl: map.iconUrl ?? "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateMapAction(map.id, draft);
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
          <p className="text-sm text-bone">{map.name}</p>
          <p className="text-[10px] text-bone-muted">{map.realm ?? "リルム未設定"}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-[11px] text-bone-muted underline">
          編集
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bone bg-ash p-3">
      <MapFormFields draft={draft} setDraft={setDraft} />
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

export function MapManager({ maps }: { maps: MapItem[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createMapAction(draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setDraft(emptyDraft());
      router.refresh();
    });
  }

  return (
    <div>
      <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <summary className="cursor-pointer text-xs font-medium text-bone">+ 新しいマップを追加</summary>
        <div className="mt-3">
          <MapFormFields draft={draft} setDraft={setDraft} />
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

      <div className="space-y-2">
        {maps.map((m) => (
          <MapRow key={m.id} map={m} />
        ))}
      </div>
    </div>
  );
}
