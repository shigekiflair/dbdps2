"use client";

import { useState, useTransition, type CSSProperties } from "react";
import {
  drawBuildSlot,
  getKillerAddons,
  getItemAddons,
  shareBuildResult,
  savePlanProgressPayload,
} from "@/app/plans/actions";
import { RARITY_STYLE, type Rarity } from "@/lib/rarity-colors";

type CharacterResult = { id: string; name: string; iconUrl: string | null };
type PerkResult = { id: string; name: string; iconUrl: string | null };
type AddonResult = { id: string; name: string; iconUrl: string | null; rarity?: Rarity };
type ItemResult = { id: string; name: string; iconUrl: string | null };
type NameOption = { id: string; name: string };

type Row = {
  character: CharacterResult | null;
  perks: PerkResult[];
  addons: AddonResult[];
  item: ItemResult | null;
  itemAddons: AddonResult[];
  lockedChar: boolean;
  lockedPerkIds: Set<string>;
  lockedAddonIds: Set<string>;
  lockedItem: boolean;
  lockedItemAddonIds: Set<string>;
  hasDrawn: boolean;
  shareCode: string | null;
  // 低確率の「停電」が発生し、このラウンドはノーパーク（キャラクターのみ）で
  // 儀式に挑むことになった行かどうか
  blackedOut: boolean;
};

type PerkCapRule = { perkId: string; perkName: string; maxCount: number };

function emptyRow(): Row {
  return {
    character: null,
    perks: [],
    addons: [],
    item: null,
    itemAddons: [],
    lockedChar: false,
    lockedPerkIds: new Set(),
    lockedAddonIds: new Set(),
    lockedItem: false,
    lockedItemAddonIds: new Set(),
    hasDrawn: false,
    shareCode: null,
    blackedOut: false,
  };
}

const ADDON_COUNT = 2;
const ITEM_ADDON_COUNT = 2;

function pillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-[11px] ${
    active ? "bg-blood text-[#FCEBEB]" : "border border-[#2C2C2A] text-bone-muted"
  }`;
}

const LIMIT_OPTIONS: (number | null)[] = [null, 1, 2, 3];

// 停電の呪いでノーパークになった枠に表示する専用カード
function SkullCard() {
  return (
    <div className="rounded-lg border border-[#4a1010] bg-[#1a0d0d] p-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center text-lg">💀</div>
      <p className="text-[11px] text-[#ff8080]">NO</p>
    </div>
  );
}

function AddonCard({
  addon,
  locked,
  spinning,
  onToggle,
}: {
  addon: AddonResult | undefined;
  locked: boolean;
  spinning: boolean;
  onToggle: () => void;
}) {
  const rarity = addon?.rarity;
  const style = rarity ? RARITY_STYLE[rarity] : null;
  const isUltra = !!style && rarity === "ultra_rare" && !spinning;
  const settleClass = spinning ? "tf-card-spinning" : isUltra ? "tf-ultra-rare" : "tf-card-settle";
  return (
    <button
      onClick={onToggle}
      style={style && !spinning ? { background: style.bg, borderColor: style.border } : undefined}
      className={`rounded-lg border p-3 text-center transition-colors ${style ? "" : "bg-ash2"} ${
        locked && !style ? "border-blood" : !style ? "border-[#2C2C2A]" : ""
      } ${settleClass}`}
    >
      {isUltra &&
        Array.from({ length: 8 }).map((_, s) => (
          <span key={s} className="tf-spark" style={{ "--spark-angle": `${s * 45}deg` } as CSSProperties} />
        ))}
      <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash" />
      {style && !spinning && (
        <p className="mb-1 text-[9px] uppercase tracking-wide" style={{ color: style.labelText }}>
          {style.label}
        </p>
      )}
      <p className="text-[11px]" style={style && !spinning ? { color: style.text } : undefined}>
        {spinning ? "…" : addon?.name ?? "?"}
      </p>
      {locked && (
        <p className="mt-1 text-[10px]" style={style ? { color: style.labelText } : undefined}>
          固定中
        </p>
      )}
    </button>
  );
}

export function RandomSelectTool({
  killers,
  survivors,
  killerPerks,
  survivorPerks,
  itemList,
  conquest,
}: {
  killers: NameOption[];
  survivors: NameOption[];
  killerPerks: NameOption[];
  survivorPerks: NameOption[];
  itemList: NameOption[];
  /** 全パーク制覇チャレンジ用: 指定すると役割固定＋抽選したパークを自動で「使用済み」に登録する */
  conquest?: { slug: string; role: "killer" | "survivor"; initialUsedIds: string[] };
}) {
  const [role, setRole] = useState<"survivor" | "killer">(conquest?.role ?? "survivor");
  const [count, setCount] = useState(1);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [, startTransition] = useTransition();
  // 行ごとの「抽選中」状態。useTransitionのisPendingはコンポーネント全体で1つしか無く、
  // 1行だけ回しても無関係な行のカードまで一緒にスピン演出してしまうため、
  // 行番号単位で管理する（自己レビュー指摘#2への対応）。
  const [pendingRows, setPendingRows] = useState<Set<number>>(new Set());
  const anyPending = pendingRows.size > 0;
  // 抽選失敗時にユーザーへ知らせるためのエラーメッセージ（自己レビュー指摘#1への対応）
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [conquestUsed, setConquestUsed] = useState<Set<string>>(new Set(conquest?.initialUsedIds ?? []));
  const [conquestPanelOpen, setConquestPanelOpen] = useState(false);
  // 低確率の特殊演出「停電」が発生している行番号の集合（複数行が同時に発生することもある）
  const [blackoutRows, setBlackoutRows] = useState<Set<number>>(new Set());

  // --- 詳細ルール ------------------------------------------------
  const [perkUsageLimit, setPerkUsageLimit] = useState<number | null>(null);
  const [killerUsageLimit, setKillerUsageLimit] = useState<number | null>(null);
  const [addonUsageLimit, setAddonUsageLimit] = useState<number | null>(null);
  const [bannedPerkIds, setBannedPerkIds] = useState<Set<string>>(new Set());
  // アドオンの禁止リストはキラーのアドオン・サバイバーのアイテムアドオンで共有する
  // （IDは常にaddonsテーブルの一意なUUIDなので、片方の禁止設定がもう片方に誤爆することはない）
  const [bannedAddonIds, setBannedAddonIds] = useState<Set<string>>(new Set());
  // 抽選・指定で登場したキラーのアドオン一覧をキラーIDごとにキャッシュする
  // （43体分を最初から全取得すると重いため、登場したキラーの分だけ遅延取得する）
  const [addonOptionsByKiller, setAddonOptionsByKiller] = useState<Record<string, NameOption[]>>({});
  const [addonKillerNames, setAddonKillerNames] = useState<Record<string, string>>({});
  // アイテムは5種類しか無いため、アドオン一覧は登場したアイテムの分だけ遅延取得してキャッシュする
  // （キラーのaddonOptionsByKillerと同じ考え方。自己レビュー指摘#4：キラー側にしか無かった
  // 禁止アドオン機能をアイテムアドオン側にも対称に持たせるための追加）
  const [addonOptionsByItem, setAddonOptionsByItem] = useState<Record<string, NameOption[]>>({});
  const [addonItemNames, setAddonItemNames] = useState<Record<string, string>>({});
  const [perkCapRules, setPerkCapRules] = useState<PerkCapRule[]>([]);
  const [perkUsageCounts, setPerkUsageCounts] = useState<Record<string, number>>({});
  const [killerUsageCounts, setKillerUsageCounts] = useState<Record<string, number>>({});
  const [addonUsageCounts, setAddonUsageCounts] = useState<Record<string, number>>({});
  const [capPerkDraft, setCapPerkDraft] = useState("");
  const [capCountDraft, setCapCountDraft] = useState("2");

  const characterList = role === "killer" ? killers : survivors;
  const perkList = role === "killer" ? killerPerks : survivorPerks;

  function selectRole(r: "survivor" | "killer") {
    const nextCount = r === "killer" ? 1 : count;
    setRole(r);
    setCount(nextCount);
    setRows(Array.from({ length: nextCount }, emptyRow));
  }

  function selectCount(c: number) {
    setCount(c);
    setRows(Array.from({ length: c }, emptyRow));
  }

  // --- ルール操作 --------------------------------------------------

  function toggleBannedPerk(perkId: string) {
    setBannedPerkIds((prev) => {
      const next = new Set(prev);
      if (next.has(perkId)) next.delete(perkId);
      else next.add(perkId);
      return next;
    });
  }

  function toggleBannedAddon(addonId: string) {
    setBannedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  }

  // 行にキラーが確定した際に呼び出し、そのキラーの全アドオンを1度だけ取得してキャッシュする
  // （「禁止アドオン」プルダウンに表示するため。抽選そのものはサーバー側で完結する）
  function ensureAddonOptions(killerId: string) {
    const killerName = killers.find((k) => k.id === killerId)?.name;
    if (killerName) setAddonKillerNames((prev) => (prev[killerId] ? prev : { ...prev, [killerId]: killerName }));
    if (addonOptionsByKiller[killerId]) return;
    startTransition(async () => {
      const list = await getKillerAddons(killerId);
      setAddonOptionsByKiller((prev) =>
        prev[killerId] ? prev : { ...prev, [killerId]: list.map((a) => ({ id: a.id, name: a.name })) }
      );
    });
  }

  // アイテムは5種類しか無いので、キラーのensureAddonOptionsと全く同じ考え方で
  // アイテムごとのアドオン一覧を遅延キャッシュする（自己レビュー指摘#4対応）
  function ensureItemAddonOptions(itemId: string) {
    const itemName = itemList.find((it) => it.id === itemId)?.name;
    if (itemName) setAddonItemNames((prev) => (prev[itemId] ? prev : { ...prev, [itemId]: itemName }));
    if (addonOptionsByItem[itemId]) return;
    startTransition(async () => {
      const list = await getItemAddons(itemId);
      setAddonOptionsByItem((prev) =>
        prev[itemId] ? prev : { ...prev, [itemId]: list.map((a) => ({ id: a.id, name: a.name })) }
      );
    });
  }

  // スマホの触覚フィードバック。iOS Safariは非対応のため、無ければ黙って何もしない
  // （対応端末では気持ちよく、非対応でも見た目だけで成立するようにする）
  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // 一部ブラウザは呼び出し自体は許可するが失敗することがあるため握りつぶす
      }
    }
  }

  function markRowsPending(indices: number[]) {
    setPendingRows((prev) => {
      const next = new Set(prev);
      for (const i of indices) next.add(i);
      return next;
    });
  }
  function clearRowsPending(indices: number[]) {
    setPendingRows((prev) => {
      const next = new Set(prev);
      for (const i of indices) next.delete(i);
      return next;
    });
  }

  function addCapRule() {
    if (!capPerkDraft) return;
    const perk = survivorPerks.find((p) => p.id === capPerkDraft);
    if (!perk) return;
    setPerkCapRules((prev) => {
      const withoutExisting = prev.filter((r) => r.perkId !== capPerkDraft);
      return [...withoutExisting, { perkId: perk.id, perkName: perk.name, maxCount: Number(capCountDraft) }];
    });
    setCapPerkDraft("");
  }

  function removeCapRule(perkId: string) {
    setPerkCapRules((prev) => prev.filter((r) => r.perkId !== perkId));
  }

  function resetUsageHistory() {
    setPerkUsageCounts({});
    setKillerUsageCounts({});
    setAddonUsageCounts({});
  }

  // --- 抽選除外条件の算出 --------------------------------------------

  function tallyOtherRowsPerkCounts(excludeRowIndex: number | null): Record<string, number> {
    const counts: Record<string, number> = {};
    rows.forEach((r, i) => {
      if (i === excludeRowIndex) return;
      for (const p of r.perks) counts[p.id] = (counts[p.id] ?? 0) + 1;
    });
    return counts;
  }

  function computeExcludedPerkIds(baseCounts: Record<string, number>): string[] {
    const excluded = new Set<string>(bannedPerkIds);
    if (conquest) {
      for (const id of conquestUsed) excluded.add(id);
    }
    if (role === "survivor") {
      for (const rule of perkCapRules) {
        const used = baseCounts[rule.perkId] ?? 0;
        if (used >= rule.maxCount) excluded.add(rule.perkId);
      }
    }
    if (perkUsageLimit !== null) {
      for (const [perkId, cnt] of Object.entries(perkUsageCounts)) {
        if (cnt >= perkUsageLimit) excluded.add(perkId);
      }
    }
    return Array.from(excluded);
  }

  /** 制覇モード: 新しく引いたパークを「使用済み」として記録し、DBにも保存する */
  function markConquestUsed(newPerks: PerkResult[]) {
    if (!conquest || newPerks.length === 0) return;
    const next = new Set(conquestUsed);
    for (const p of newPerks) next.add(p.id);
    if (next.size === conquestUsed.size) return; // 変化なし
    setConquestUsed(next);
    startTransition(() => savePlanProgressPayload(conquest.slug, { usedIds: Array.from(next) }));
  }

  function computeExcludedCharacterIds(): string[] {
    if (role !== "killer" || killerUsageLimit === null) return [];
    return Object.entries(killerUsageCounts)
      .filter(([, cnt]) => cnt >= killerUsageLimit)
      .map(([id]) => id);
  }

  function computeExcludedAddonIds(): string[] {
    const excluded = new Set<string>(bannedAddonIds);
    if (addonUsageLimit !== null) {
      for (const [addonId, cnt] of Object.entries(addonUsageCounts)) {
        if (cnt >= addonUsageLimit) excluded.add(addonId);
      }
    }
    return Array.from(excluded);
  }

  function bumpUsageCounts(
    newCharacter: CharacterResult | null,
    newPerks: PerkResult[],
    newAddons: AddonResult[] = [],
    newItemAddons: AddonResult[] = []
  ) {
    if (newPerks.length > 0) {
      setPerkUsageCounts((prev) => {
        const next = { ...prev };
        for (const p of newPerks) next[p.id] = (next[p.id] ?? 0) + 1;
        return next;
      });
    }
    if (newAddons.length > 0 || newItemAddons.length > 0) {
      setAddonUsageCounts((prev) => {
        const next = { ...prev };
        for (const a of [...newAddons, ...newItemAddons]) next[a.id] = (next[a.id] ?? 0) + 1;
        return next;
      });
    }
    if (role === "killer" && newCharacter) {
      setKillerUsageCounts((prev) => ({ ...prev, [newCharacter.id]: (prev[newCharacter.id] ?? 0) + 1 }));
    }
  }

  // --- 抽選実行 -----------------------------------------------------

  function drawRow(index: number, resetAll: boolean) {
    const row = rows[index];
    const needCharacter = resetAll || !row.lockedChar;
    const keptPerks = resetAll ? [] : row.perks.filter((p) => row.lockedPerkIds.has(p.id));
    const perkCount = 4 - keptPerks.length;

    // アドオンはキラーに紐づくため、キラーを引き直す場合は固定を引き継がずリセットする
    const keptAddons = resetAll || needCharacter ? [] : row.addons.filter((a) => row.lockedAddonIds.has(a.id));
    const addonCount = role === "killer" ? ADDON_COUNT - keptAddons.length : 0;

    // アイテムアドオンも同様にアイテムに紐づく
    const needItem = role === "survivor" && (resetAll || !row.lockedItem);
    const keptItemAddons =
      resetAll || needItem ? [] : row.itemAddons.filter((a) => row.lockedItemAddonIds.has(a.id));
    const itemAddonCount = role === "survivor" ? ITEM_ADDON_COUNT - keptItemAddons.length : 0;

    const otherCounts = tallyOtherRowsPerkCounts(index);
    const excludePerkIds = [...keptPerks.map((p) => p.id), ...computeExcludedPerkIds(otherCounts)];
    const excludeCharacterIds = computeExcludedCharacterIds();
    const excludeAddonIds = [...keptAddons.map((a) => a.id), ...computeExcludedAddonIds()];
    const excludeItemAddonIds = [...keptItemAddons.map((a) => a.id), ...computeExcludedAddonIds()];
    const currentKillerId = !needCharacter ? row.character?.id : undefined;
    const currentItemId = role === "survivor" && !needItem ? row.item?.id : undefined;

    setErrorMessage(null);
    markRowsPending([index]);

    startTransition(async () => {
      try {
        const drawn = await drawBuildSlot(role, {
          needCharacter,
          perkCount,
          excludePerkIds,
          excludeCharacterIds,
          addonCount,
          excludeAddonIds,
          currentKillerId,
          needItem,
          itemAddonCount,
          excludeItemAddonIds,
          currentItemId,
        });
        const finalCharacter = needCharacter ? drawn.character : row.character;
        const finalAddons = role === "killer" ? [...keptAddons, ...drawn.addons] : [];
        const finalItem = role === "survivor" ? (needItem ? drawn.item : row.item) : null;
        const finalItemAddons = role === "survivor" ? [...keptItemAddons, ...drawn.itemAddons] : [];

        // 低確率(約1/150)で「停電」が発生し、パーク・アイテム・アドオンが全てはぎ取られる。
        // キャラクターだけは残る（自己レビュー後のユーザー要望：見た目だけでなく実際の結果にする）
        const isBlackout = Math.random() < 1 / 150;

        setRows((prev) => {
          const next = [...prev];
          next[index] = isBlackout
            ? {
                character: finalCharacter,
                perks: [],
                addons: [],
                item: null,
                itemAddons: [],
                lockedChar: resetAll ? false : row.lockedChar,
                lockedPerkIds: new Set(),
                lockedAddonIds: new Set(),
                lockedItem: false,
                lockedItemAddonIds: new Set(),
                hasDrawn: true,
                shareCode: null,
                blackedOut: true,
              }
            : {
                character: finalCharacter,
                perks: [...keptPerks, ...drawn.perks],
                addons: finalAddons,
                item: finalItem,
                itemAddons: finalItemAddons,
                lockedChar: resetAll ? false : row.lockedChar,
                lockedPerkIds: resetAll ? new Set() : row.lockedPerkIds,
                lockedAddonIds: resetAll || needCharacter ? new Set() : row.lockedAddonIds,
                lockedItem: resetAll ? false : row.lockedItem,
                lockedItemAddonIds: resetAll || needItem ? new Set() : row.lockedItemAddonIds,
                hasDrawn: true,
                shareCode: null,
                blackedOut: false,
              };
          return next;
        });

        if (role === "killer" && finalCharacter) ensureAddonOptions(finalCharacter.id);
        if (role === "survivor" && finalItem) ensureItemAddonOptions(finalItem.id);
        if (!isBlackout) {
          bumpUsageCounts(needCharacter ? finalCharacter : null, drawn.perks, drawn.addons, drawn.itemAddons);
          markConquestUsed(drawn.perks);
        }

        const hasUltraRare = [...drawn.addons, ...drawn.itemAddons].some((a) => a.rarity === "ultra_rare");
        if (isBlackout) {
          vibrate([40, 80, 40, 80, 200]);
          setBlackoutRows((prev) => new Set(prev).add(index));
          window.setTimeout(() => {
            setBlackoutRows((prev) => {
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
          }, 1400);
        } else if (hasUltraRare) {
          vibrate([15, 60, 15, 60, 15]);
        } else {
          vibrate(20);
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("抽選に失敗しました。通信状況を確認してもう一度お試しください。");
      } finally {
        clearRowsPending([index]);
      }
    });
  }

  function drawAllRows(resetAll: boolean) {
    setErrorMessage(null);
    const allIndices = rows.map((_, i) => i);
    markRowsPending(allIndices);

    startTransition(async () => {
      try {
        const batchPerkCounts: Record<string, number> = {};
        for (const row of rows) {
          const kept = resetAll || !row.hasDrawn ? [] : row.perks.filter((p) => row.lockedPerkIds.has(p.id));
          for (const p of kept) batchPerkCounts[p.id] = (batchPerkCounts[p.id] ?? 0) + 1;
        }
        const excludeCharacterIds = computeExcludedCharacterIds();

        const newRows: Row[] = [];
        const perkUsageDelta: Record<string, number> = {};
        const addonUsageDelta: Record<string, number> = {};
        let killerUsageDeltaId: string | null = null;
        const killersToLoad = new Set<string>();
        const itemsToLoad = new Set<string>();
        const allDrawnPerks: PerkResult[] = [];
        let hasUltraRare = false;
        const blackoutIndices: number[] = [];

        // 超低確率(約1/2000)で「全員停電」が発生する。複数人で回している時のみ意味があるので
        // 1行しか無い時は対象外。単発の停電(約1/150、drawRow参照)より一段レアな特殊演出
        const isTotalBlackout = rows.length > 1 && Math.random() < 1 / 2000;

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const needCharacter = resetAll || !row.hasDrawn || !row.lockedChar;
          const keptPerks = resetAll || !row.hasDrawn ? [] : row.perks.filter((p) => row.lockedPerkIds.has(p.id));
          const perkCount = 4 - keptPerks.length;
          const excludePerkIds = [...keptPerks.map((p) => p.id), ...computeExcludedPerkIds(batchPerkCounts)];

          const keptAddons =
            resetAll || !row.hasDrawn || needCharacter
              ? []
              : row.addons.filter((a) => row.lockedAddonIds.has(a.id));
          const addonCount = role === "killer" ? ADDON_COUNT - keptAddons.length : 0;
          const excludeAddonIds = [...keptAddons.map((a) => a.id), ...computeExcludedAddonIds()];
          const currentKillerId = !needCharacter ? row.character?.id : undefined;

          const needItem = role === "survivor" && (resetAll || !row.hasDrawn || !row.lockedItem);
          const keptItemAddons =
            resetAll || !row.hasDrawn || needItem
              ? []
              : row.itemAddons.filter((a) => row.lockedItemAddonIds.has(a.id));
          const itemAddonCount = role === "survivor" ? ITEM_ADDON_COUNT - keptItemAddons.length : 0;
          const excludeItemAddonIds = [...keptItemAddons.map((a) => a.id), ...computeExcludedAddonIds()];
          const currentItemId = role === "survivor" && !needItem ? row.item?.id : undefined;

          const drawn = await drawBuildSlot(role, {
            needCharacter,
            perkCount,
            excludePerkIds,
            excludeCharacterIds,
            addonCount,
            excludeAddonIds,
            currentKillerId,
            needItem,
            itemAddonCount,
            excludeItemAddonIds,
            currentItemId,
          });
          const finalCharacter = needCharacter ? drawn.character : row.character;
          const finalPerks = [...keptPerks, ...drawn.perks];
          const finalAddons = role === "killer" ? [...keptAddons, ...drawn.addons] : [];
          const finalItem = role === "survivor" ? (needItem ? drawn.item : row.item) : null;
          const finalItemAddons = role === "survivor" ? [...keptItemAddons, ...drawn.itemAddons] : [];

          // 全員停電が発動していない時だけ、この行単独の停電(約1/150)も抽選する
          const isRowBlackout = isTotalBlackout || (!isTotalBlackout && Math.random() < 1 / 150);

          if (isRowBlackout) {
            blackoutIndices.push(rowIndex);
            newRows.push({
              character: finalCharacter,
              perks: [],
              addons: [],
              item: null,
              itemAddons: [],
              lockedChar: resetAll || !row.hasDrawn ? false : row.lockedChar,
              lockedPerkIds: new Set(),
              lockedAddonIds: new Set(),
              lockedItem: false,
              lockedItemAddonIds: new Set(),
              hasDrawn: true,
              shareCode: null,
              blackedOut: true,
            });
            if (role === "killer" && finalCharacter) killersToLoad.add(finalCharacter.id);
            continue;
          }

          for (const p of drawn.perks) {
            batchPerkCounts[p.id] = (batchPerkCounts[p.id] ?? 0) + 1;
            perkUsageDelta[p.id] = (perkUsageDelta[p.id] ?? 0) + 1;
            allDrawnPerks.push(p);
          }
          for (const a of [...drawn.addons, ...drawn.itemAddons]) {
            addonUsageDelta[a.id] = (addonUsageDelta[a.id] ?? 0) + 1;
            if (a.rarity === "ultra_rare") hasUltraRare = true;
          }
          if (needCharacter && role === "killer" && finalCharacter) {
            killerUsageDeltaId = finalCharacter.id;
          }
          if (role === "killer" && finalCharacter) killersToLoad.add(finalCharacter.id);
          if (role === "survivor" && finalItem) itemsToLoad.add(finalItem.id);

          newRows.push({
            character: finalCharacter,
            perks: finalPerks,
            addons: finalAddons,
            item: finalItem,
            itemAddons: finalItemAddons,
            lockedChar: resetAll || !row.hasDrawn ? false : row.lockedChar,
            lockedPerkIds: resetAll || !row.hasDrawn ? new Set() : row.lockedPerkIds,
            lockedAddonIds: resetAll || !row.hasDrawn || needCharacter ? new Set() : row.lockedAddonIds,
            lockedItem: resetAll || !row.hasDrawn ? false : row.lockedItem,
            lockedItemAddonIds: resetAll || !row.hasDrawn || needItem ? new Set() : row.lockedItemAddonIds,
            hasDrawn: true,
            shareCode: null,
            blackedOut: false,
          });
        }

        setRows(newRows);
        markConquestUsed(allDrawnPerks);
        for (const killerId of killersToLoad) ensureAddonOptions(killerId);
        for (const itemId of itemsToLoad) ensureItemAddonOptions(itemId);
        if (blackoutIndices.length > 0) {
          vibrate(isTotalBlackout ? [60, 100, 60, 100, 60, 100, 300] : [40, 80, 40, 80, 200]);
          setBlackoutRows((prev) => {
            const next = new Set(prev);
            for (const i of blackoutIndices) next.add(i);
            return next;
          });
          window.setTimeout(() => {
            setBlackoutRows((prev) => {
              const next = new Set(prev);
              for (const i of blackoutIndices) next.delete(i);
              return next;
            });
          }, isTotalBlackout ? 2200 : 1400);
        } else if (hasUltraRare) {
          vibrate([15, 60, 15, 60, 15]);
        } else {
          vibrate(20);
        }
        if (Object.keys(perkUsageDelta).length > 0) {
          setPerkUsageCounts((prev) => {
            const next = { ...prev };
            for (const [id, delta] of Object.entries(perkUsageDelta)) next[id] = (next[id] ?? 0) + delta;
            return next;
          });
        }
        if (Object.keys(addonUsageDelta).length > 0) {
          setAddonUsageCounts((prev) => {
            const next = { ...prev };
            for (const [id, delta] of Object.entries(addonUsageDelta)) next[id] = (next[id] ?? 0) + delta;
            return next;
          });
        }
        if (killerUsageDeltaId) {
          const id = killerUsageDeltaId;
          setKillerUsageCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("抽選に失敗しました。通信状況を確認してもう一度お試しください。");
      } finally {
        clearRowsPending(allIndices);
      }
    });
  }

  function pinCharacter(index: number, characterId: string) {
    const character = characterList.find((c) => c.id === characterId);
    if (!character) return;
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        character: { ...character, iconUrl: null },
        addons: [],
        lockedChar: true,
        lockedAddonIds: new Set(),
        hasDrawn: true,
        blackedOut: false,
      };
      return next;
    });
    if (role === "killer") ensureAddonOptions(characterId);
    bumpUsageCounts({ ...character, iconUrl: null }, []);
  }

  function pinItem(index: number, itemId: string) {
    const item = itemList.find((it) => it.id === itemId);
    if (!item) return;
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        item: { ...item, iconUrl: null },
        itemAddons: [],
        lockedItem: true,
        lockedItemAddonIds: new Set(),
        hasDrawn: true,
        blackedOut: false,
      };
      return next;
    });
    ensureItemAddonOptions(itemId);
  }

  function toggleLockChar(index: number) {
    vibrate(10);
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], lockedChar: !next[index].lockedChar };
      return next;
    });
  }

  function toggleLockPerk(index: number, perkId: string) {
    vibrate(10);
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      const lockedPerkIds = new Set(row.lockedPerkIds);
      if (lockedPerkIds.has(perkId)) lockedPerkIds.delete(perkId);
      else lockedPerkIds.add(perkId);
      next[index] = { ...row, lockedPerkIds };
      return next;
    });
  }

  function toggleLockAddon(index: number, addonId: string) {
    vibrate(10);
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      const lockedAddonIds = new Set(row.lockedAddonIds);
      if (lockedAddonIds.has(addonId)) lockedAddonIds.delete(addonId);
      else lockedAddonIds.add(addonId);
      next[index] = { ...row, lockedAddonIds };
      return next;
    });
  }

  function toggleLockItem(index: number) {
    vibrate(10);
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], lockedItem: !next[index].lockedItem };
      return next;
    });
  }

  function toggleLockItemAddon(index: number, addonId: string) {
    vibrate(10);
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      const lockedItemAddonIds = new Set(row.lockedItemAddonIds);
      if (lockedItemAddonIds.has(addonId)) lockedItemAddonIds.delete(addonId);
      else lockedItemAddonIds.add(addonId);
      next[index] = { ...row, lockedItemAddonIds };
      return next;
    });
  }

  function shareRow(index: number) {
    const row = rows[index];
    if (!row.character) return;
    const extraAddons =
      role === "killer" ? row.addons : [...(row.item ? [row.item] : []), ...row.itemAddons];
    startTransition(async () => {
      const code = await shareBuildResult({ role, character: row.character, perks: row.perks, addons: extraAddons });
      setRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], shareCode: code };
        return next;
      });
    });
  }

  function copyUrl(index: number, target: "share" | "overlay") {
    const code = rows[index].shareCode;
    if (!code) return;
    const path = target === "share" ? `/share/${code}` : `/overlay/${code}`;
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div>
      {conquest && (
        <div className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash2 p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setConquestPanelOpen((v) => !v)}
              className="flex flex-1 items-center justify-between text-left"
            >
              <span className="text-xs text-bone">
                使用済みパーク一覧（{conquestUsed.size} / {perkList.length}）
                {conquestUsed.size >= perkList.length && perkList.length > 0 && " — 🎉 全パーク制覇達成！"}
              </span>
              <span className="text-[11px] text-bone-muted">{conquestPanelOpen ? "閉じる ▲" : "開く ▼"}</span>
            </button>
            <button
              onClick={() => {
                if (conquestUsed.size === 0) return;
                if (!window.confirm("使用済みパークの記録をすべてリセットします。よろしいですか？")) return;
                setConquestUsed(new Set());
                startTransition(() => savePlanProgressPayload(conquest.slug, { usedIds: [] }));
              }}
              className="shrink-0 text-[11px] text-bone-muted underline"
            >
              リセット
            </button>
          </div>
          <div className="mt-2 h-2 rounded-full bg-ash">
            <div
              className="h-2 rounded-full bg-blood transition-all"
              style={{ width: `${perkList.length ? (conquestUsed.size / perkList.length) * 100 : 0}%` }}
            />
          </div>
          {conquestPanelOpen && (
            <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {perkList.map((p) => (
                <div
                  key={p.id}
                  className={`rounded border p-2 text-[11px] ${
                    conquestUsed.has(p.id)
                      ? "border-blood bg-blood-dark text-[#F5C4B3]"
                      : "border-[#2C2C2A] bg-ash text-bone-muted"
                  }`}
                >
                  {conquestUsed.has(p.id) ? "✓ " : ""}
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!conquest && (
        <div className="mb-3 flex gap-2">
          {(["survivor", "killer"] as const).map((r) => (
            <button key={r} onClick={() => selectRole(r)} className={pillClass(role === r)}>
              {r === "survivor" ? "サバイバー" : "キラー"}
            </button>
          ))}
        </div>
      )}

      {role === "survivor" && (
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4].map((c) => (
            <button key={c} onClick={() => selectCount(c)} className={pillClass(count === c)}>
              {c}人
            </button>
          ))}
        </div>
      )}

      {/* --- 詳細ルール設定 --------------------------------------- */}
      <details className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash p-3 text-xs">
        <summary className="cursor-pointer select-none text-bone">詳細ルール設定（大会・縛り向け）</summary>
        <div className="mt-3 space-y-4">
          <div>
            <p className="mb-1 text-[11px] text-bone-muted">
              パーク使用上限（この画面を開いている間のみ有効、リロードでリセット）
            </p>
            <div className="flex gap-2">
              {LIMIT_OPTIONS.map((v) => (
                <button key={String(v)} onClick={() => setPerkUsageLimit(v)} className={pillClass(perkUsageLimit === v)}>
                  {v === null ? "なし" : `${v}回まで`}
                </button>
              ))}
            </div>
          </div>

          {role === "killer" && (
            <div>
              <p className="mb-1 text-[11px] text-bone-muted">キラー使用上限（同キャラの再登場回数）</p>
              <div className="flex gap-2">
                {LIMIT_OPTIONS.map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setKillerUsageLimit(v)}
                    className={pillClass(killerUsageLimit === v)}
                  >
                    {v === null ? "なし" : `${v}回まで`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-[11px] text-bone-muted">
              アドオン使用上限（この画面を開いている間のみ有効、リロードでリセット）
            </p>
            <div className="flex gap-2">
              {LIMIT_OPTIONS.map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setAddonUsageLimit(v)}
                  className={pillClass(addonUsageLimit === v)}
                >
                  {v === null ? "なし" : `${v}回まで`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] text-bone-muted">禁止パーク</p>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleBannedPerk(e.target.value);
              }}
              className="w-full rounded-lg border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone"
            >
              <option value="">追加する...</option>
              {perkList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {bannedPerkIds.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {[...bannedPerkIds].map((id) => {
                  const p = perkList.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-blood-dark px-2 py-1 text-[10px] text-[#F5C4B3]"
                    >
                      {p.name}
                      <button onClick={() => toggleBannedPerk(id)} aria-label="削除">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {role === "killer" && (
            <div>
              <p className="mb-1 text-[11px] text-bone-muted">
                禁止アドオン（抽選や指定で登場したキラーの分から選べます）
              </p>
              {Object.keys(addonOptionsByKiller).length === 0 ? (
                <p className="text-[11px] text-bone-muted">
                  まだキラーが登場していません。抽選するか指定すると、そのキラーのアドオン一覧が選べるようになります。
                </p>
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) toggleBannedAddon(e.target.value);
                  }}
                  className="w-full rounded-lg border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone"
                >
                  <option value="">追加する...</option>
                  {Object.entries(addonOptionsByKiller).map(([killerId, options]) => (
                    <optgroup key={killerId} label={addonKillerNames[killerId] ?? killerId}>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {bannedAddonIds.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...bannedAddonIds].map((id) => {
                    const a = Object.values(addonOptionsByKiller)
                      .flat()
                      .find((x) => x.id === id);
                    if (!a) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-blood-dark px-2 py-1 text-[10px] text-[#F5C4B3]"
                      >
                        {a.name}
                        <button onClick={() => toggleBannedAddon(id)} aria-label="削除">
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {role === "survivor" && (
            <div>
              <p className="mb-1 text-[11px] text-bone-muted">パーク人数制限（例: デッド・ハードは2人まで）</p>
              <div className="mb-2 flex gap-2">
                <select
                  value={capPerkDraft}
                  onChange={(e) => setCapPerkDraft(e.target.value)}
                  className="flex-1 rounded-lg border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone"
                >
                  <option value="">パークを選択...</option>
                  {survivorPerks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={capCountDraft}
                  onChange={(e) => setCapCountDraft(e.target.value)}
                  className="rounded-lg border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone"
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}人まで
                    </option>
                  ))}
                </select>
                <button
                  onClick={addCapRule}
                  className="rounded-lg border border-[#2C2C2A] px-3 text-[11px] text-bone"
                >
                  追加
                </button>
              </div>
              {perkCapRules.length > 0 && (
                <div className="space-y-1">
                  {perkCapRules.map((r) => (
                    <div
                      key={r.perkId}
                      className="flex items-center justify-between rounded-lg border border-[#2C2C2A] px-2 py-1"
                    >
                      <span className="text-[11px] text-bone">
                        {r.perkName}：{r.maxCount}人まで
                      </span>
                      <button onClick={() => removeCapRule(r.perkId)} className="text-[10px] text-bone-muted">
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {role === "survivor" && (
            <div className="mt-4">
              <p className="mb-1 text-[11px] text-bone-muted">
                禁止アイテムアドオン（抽選や指定で登場したアイテムの分から選べます）
              </p>
              {Object.keys(addonOptionsByItem).length === 0 ? (
                <p className="text-[11px] text-bone-muted">
                  まだアイテムが登場していません。抽選するか指定すると、そのアイテムのアドオン一覧が選べるようになります。
                </p>
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) toggleBannedAddon(e.target.value);
                  }}
                  className="w-full rounded-lg border border-[#2C2C2A] bg-ash2 px-2 py-1.5 text-[11px] text-bone"
                >
                  <option value="">追加する...</option>
                  {Object.entries(addonOptionsByItem).map(([itemId, options]) => (
                    <optgroup key={itemId} label={addonItemNames[itemId] ?? itemId}>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {bannedAddonIds.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...bannedAddonIds].map((id) => {
                    const a = Object.values(addonOptionsByItem)
                      .flat()
                      .find((x) => x.id === id);
                    if (!a) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-blood-dark px-2 py-1 text-[10px] text-[#F5C4B3]"
                      >
                        {a.name}
                        <button onClick={() => toggleBannedAddon(id)} aria-label="削除">
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button onClick={resetUsageHistory} className="text-[11px] text-bone-muted underline">
            使用履歴をリセット
          </button>
        </div>
      </details>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      {rows.length > 1 && (
        <div className="mb-4 flex gap-2">
          <button
            disabled={anyPending}
            onClick={() => drawAllRows(!rows.some((r) => r.hasDrawn))}
            className="flex-1 rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
          >
            全員分をまとめて回す
          </button>
          {rows.some((r) => r.hasDrawn) && (
            <button
              disabled={anyPending}
              onClick={() => drawAllRows(true)}
              className="rounded-lg border border-[#2C2C2A] px-3 text-xs text-bone-muted disabled:opacity-60"
            >
              全員まとめてやり直す
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, index) => {
          const rowPending = pendingRows.has(index);
          const isBlackout = blackoutRows.has(index);
          return (
          <div key={index} className="relative rounded-lg border border-[#2C2C2A] bg-ash p-3">
            {isBlackout && (
              <div className="tf-blackout absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg">
                <span className="text-3xl">💀</span>
                <span className="text-sm font-bold tracking-widest text-[#ff5555]">NO SIGNAL</span>
              </div>
            )}
            {row.blackedOut && !isBlackout && (
              <p className="mb-3 rounded-md border border-[#4a1010] bg-[#1a0d0d] px-2 py-1.5 text-center text-[11px] text-[#ff8080]">
                💀 停電の呪い発生：このラウンドはノーパークで儀式に挑む
              </p>
            )}
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="border-b border-[#2C2C2A] pb-3 sm:w-32 sm:flex-shrink-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                <button
                  onClick={() => row.character && toggleLockChar(index)}
                  className={`w-full rounded-lg border p-3 text-center ${
                    row.lockedChar ? "border-blood" : "border-[#2C2C2A]"
                  } bg-ash2 ${rowPending && !row.lockedChar ? "tf-card-spinning" : "tf-card-settle"}`}
                >
                  <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash" />
                  <p className="text-[11px] text-bone">
                    {rowPending && !row.lockedChar ? "…" : row.character?.name ?? "?"}
                  </p>
                  {row.lockedChar && <p className="mt-1 text-[10px] text-blood">固定中</p>}
                </button>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) pinCharacter(index, e.target.value);
                  }}
                  className="mt-1 w-full rounded border border-[#2C2C2A] bg-ash2 px-1 py-1 text-[10px] text-bone-muted"
                >
                  <option value="">指定する...</option>
                  {characterList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid flex-1 grid-cols-4 gap-2">
                {row.blackedOut
                  ? Array.from({ length: 4 }).map((_, i) => <SkullCard key={i} />)
                  : Array.from({ length: 4 }).map((_, i) => {
                      const perk = row.perks[i];
                      const locked = !!perk && row.lockedPerkIds.has(perk.id);
                      const spinning = rowPending && !locked;
                      return (
                        <button
                          key={`${i}-${perk?.id ?? "empty"}`}
                          onClick={() => perk && toggleLockPerk(index, perk.id)}
                          className={`rounded-lg border p-3 text-center ${
                            locked ? "border-blood" : "border-[#2C2C2A]"
                          } bg-ash2 ${spinning ? "tf-card-spinning" : "tf-card-settle"}`}
                        >
                          <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash" />
                          <p className="text-[11px] text-bone">{spinning ? "…" : perk?.name ?? "?"}</p>
                          {locked && <p className="mt-1 text-[10px] text-blood">固定中</p>}
                        </button>
                      );
                    })}
              </div>
            </div>

            {role === "killer" && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {row.blackedOut
                  ? Array.from({ length: ADDON_COUNT }).map((_, i) => <SkullCard key={i} />)
                  : Array.from({ length: ADDON_COUNT }).map((_, i) => {
                      const addon = row.addons[i];
                      const locked = !!addon && row.lockedAddonIds.has(addon.id);
                      return (
                        <AddonCard
                          // addon.id を含めることで、毎回演出アニメーションが最初から再生される
                          key={`${i}-${addon?.id ?? "empty"}`}
                          addon={addon}
                          locked={locked}
                          spinning={rowPending && !locked}
                          onToggle={() => addon && toggleLockAddon(index, addon.id)}
                        />
                      );
                    })}
              </div>
            )}

            {role === "survivor" && (
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="sm:w-32 sm:flex-shrink-0">
                  {row.blackedOut ? (
                    <SkullCard />
                  ) : (
                    <button
                      onClick={() => row.item && toggleLockItem(index)}
                      className={`w-full rounded-lg border p-3 text-center ${
                        row.lockedItem ? "border-blood" : "border-[#2C2C2A]"
                      } bg-ash2 ${rowPending && !row.lockedItem ? "tf-card-spinning" : "tf-card-settle"}`}
                    >
                      <div className="mx-auto mb-2 h-8 w-8 rounded bg-ash" />
                      <p className="text-[11px] text-bone">
                        {rowPending && !row.lockedItem ? "…" : row.item?.name ?? "?"}
                      </p>
                      {row.lockedItem && <p className="mt-1 text-[10px] text-blood">固定中</p>}
                    </button>
                  )}
                  {!row.blackedOut && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) pinItem(index, e.target.value);
                      }}
                      className="mt-1 w-full rounded border border-[#2C2C2A] bg-ash2 px-1 py-1 text-[10px] text-bone-muted"
                    >
                      <option value="">アイテム指定...</option>
                      {itemList.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {row.blackedOut
                    ? Array.from({ length: ITEM_ADDON_COUNT }).map((_, i) => <SkullCard key={i} />)
                    : Array.from({ length: ITEM_ADDON_COUNT }).map((_, i) => {
                    const addon = row.itemAddons[i];
                    const locked = !!addon && row.lockedItemAddonIds.has(addon.id);
                    return (
                      <AddonCard
                        key={`${i}-${addon?.id ?? "empty"}`}
                        addon={addon}
                        locked={locked}
                        spinning={rowPending && !locked}
                        onToggle={() => addon && toggleLockItemAddon(index, addon.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-2 flex gap-2">
              <button
                disabled={rowPending}
                onClick={() => drawRow(index, !row.hasDrawn)}
                className="flex-1 rounded-lg bg-blood py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
              >
                {row.hasDrawn ? "固定以外を回す" : "抽選する"}
              </button>
              {row.hasDrawn && (
                <button
                  disabled={rowPending}
                  onClick={() => drawRow(index, true)}
                  className="rounded-lg border border-[#2C2C2A] px-3 text-xs text-bone-muted disabled:opacity-60"
                >
                  全部やり直す
                </button>
              )}
            </div>

            {row.hasDrawn && row.character && (
              !row.shareCode ? (
                <button
                  disabled={rowPending}
                  onClick={() => shareRow(index)}
                  className="w-full rounded-md border border-[#2C2C2A] py-1.5 text-[11px] text-bone-muted"
                >
                  この結果を共有する
                </button>
              ) : (
                <div className="flex gap-4 text-[11px] text-bone-muted">
                  <button onClick={() => copyUrl(index, "share")} className="underline">
                    {copiedIndex === index ? "コピーしました" : "共有リンク"}
                  </button>
                  <button onClick={() => copyUrl(index, "overlay")} className="underline">
                    OBSリンク
                  </button>
                </div>
              )
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
