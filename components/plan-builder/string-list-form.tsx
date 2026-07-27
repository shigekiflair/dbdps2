"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStringListPlan } from "@/app/plans/new/actions";

type StringListType = "trigger_internal" | "chain" | "roleplay" | "escalation" | "data_accumulation" | "betting";

const TYPE_LABEL: Record<StringListType, string> = {
  trigger_internal: "イベントトリガー型",
  chain: "連鎖・ミッションチェーン型",
  roleplay: "ロールプレイ型",
  escalation: "エスカレーション型",
  data_accumulation: "データ蓄積型",
  betting: "予想・ベッティング型",
};

const ITEM_LABEL: Record<StringListType, string> = {
  trigger_internal: "開示する項目（1行1件）",
  chain: "ミッション（1行1件、上から順にクリアしていく）",
  roleplay: "お題（1行1件、ランダムに引く）",
  escalation: "追加ルール（1行1件、ポイントが貯まるごとに追加される）",
  data_accumulation: "記録するカテゴリ（1行1件）",
  betting: "",
};

export function StringListPlanForm({ type }: { type: StringListType }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("unlisted");
  const [itemsText, setItemsText] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const { slug } = await createStringListPlan({
          type,
          title,
          description,
          visibility,
          items: itemsText.split("\n"),
          threshold: type === "escalation" ? threshold : undefined,
        });
        router.push(`/plans/${slug}?created=1`);
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "作成に失敗しました。");
      }
    });
  }

  return (
    <div>
      <p className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone-muted">
        {TYPE_LABEL[type]}
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
          placeholder="例：試合中セリフガチャ"
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-bone-muted">説明（視聴者にも表示されます）</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
        />
      </label>

      {type !== "betting" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-bone-muted">{ITEM_LABEL[type]}</span>
          <textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            rows={8}
            placeholder={"1行に1件ずつ入力してください"}
            className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone placeholder:text-bone-muted"
          />
        </label>
      )}

      {type === "escalation" && (
        <label className="mb-3 block max-w-[160px]">
          <span className="mb-1 block text-xs text-bone-muted">何ポイントごとにルール追加？</span>
          <input
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 1)}
            className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-sm text-bone"
          />
        </label>
      )}

      <label className="mb-5 block max-w-[240px]">
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
        作成する
      </button>
    </div>
  );
}
