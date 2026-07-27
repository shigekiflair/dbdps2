"use client";

import { useEffect, useState, useTransition } from "react";
import {
  openBettingRound,
  closeBettingRound,
  reopenBettingRound,
  resolveBettingRound,
  castBettingVote,
  getBettingState,
} from "@/app/betting/actions";

type BettingOption = { id: string; label: string };
type BettingMode = "win" | "exacta" | "trifecta";
type RoundStatus = "open" | "closed" | "resolved";
type Round = {
  id: string;
  question: string;
  mode: BettingMode;
  options: BettingOption[];
  status: RoundStatus;
  correctPicks: string[] | null;
};
type LeaderboardRow = { userId: string; totalPoints: number; name: string | null };
type CharacterOption = { id: string; name: string; role: "killer" | "survivor" };

type BettingState = {
  round: Round | null;
  myVote: string[] | null;
  firstPickCounts: Record<string, number>;
  leaderboard: LeaderboardRow[];
  isHost: boolean;
  myUserId: string | null;
};

const STATUS_LABEL: Record<RoundStatus, string> = {
  open: "投票受付中",
  closed: "投票締切・結果発表待ち",
  resolved: "結果発表済み",
};

const MODE_LABEL: Record<BettingMode, string> = { win: "単勝", exacta: "2連単", trifecta: "3連単" };
const MODE_PICK_COUNT: Record<BettingMode, number> = { win: 1, exacta: 2, trifecta: 3 };
const MODE_POINTS: Record<BettingMode, number> = { win: 10, exacta: 30, trifecta: 50 };
const ORDINAL = ["1着", "2着", "3着"];

function newOptionId() {
  return Math.random().toString(36).slice(2, 8);
}

export function BettingTool({ plan, characters = [] }: { plan: { slug: string }; characters?: CharacterOption[] }) {
  const [state, setState] = useState<BettingState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<BettingMode>("win");
  const [optionDrafts, setOptionDrafts] = useState<BettingOption[]>([
    { id: newOptionId(), label: "" },
    { id: newOptionId(), label: "" },
  ]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());

  const [myPicksDraft, setMyPicksDraft] = useState<string[]>([]);
  const [resolvePicksDraft, setResolvePicksDraft] = useState<string[]>([]);

  function refresh() {
    startTransition(async () => {
      try {
        const next = await getBettingState(plan.slug);
        setState(next as BettingState);
      } catch (err) {
        console.error(err);
      }
    });
  }

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 6000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.slug]);

  useEffect(() => {
    if (state?.myVote) setMyPicksDraft(state.myVote);
  }, [state?.round?.id, state?.myVote]);

  function updateOptionDraft(id: string, label: string) {
    setOptionDrafts((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  }
  function addOptionDraft() {
    if (optionDrafts.length >= 12) return;
    setOptionDrafts((prev) => [...prev, { id: newOptionId(), label: "" }]);
  }
  function removeOptionDraft(id: string) {
    setOptionDrafts((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.id !== id)));
  }
  function toggleCharacter(id: string) {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitNewRound() {
    setErrorMessage(null);
    const textOptions = optionDrafts.filter((o) => o.label.trim());
    const characterOptions = characters
      .filter((c) => selectedCharacterIds.has(c.id))
      .map((c) => ({ id: c.id, label: c.name }));
    const options = [...characterOptions, ...textOptions];

    startTransition(async () => {
      try {
        await openBettingRound(plan.slug, question, mode, options);
        setQuestion("");
        setOptionDrafts([
          { id: newOptionId(), label: "" },
          { id: newOptionId(), label: "" },
        ]);
        setSelectedCharacterIds(new Set());
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "ラウンドの作成に失敗しました。");
      }
    });
  }

  function togglePick(draft: string[], setDraft: (v: string[]) => void, optionId: string, need: number) {
    if (draft.includes(optionId)) {
      setDraft(draft.filter((id) => id !== optionId));
      return;
    }
    if (draft.length >= need) return;
    setDraft([...draft, optionId]);
  }

  function submitVote() {
    if (!state?.round) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await castBettingVote(state.round!.id, myPicksDraft);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "投票に失敗しました。");
      }
    });
  }

  function close() {
    if (!state?.round) return;
    startTransition(async () => {
      try {
        await closeBettingRound(state.round!.id);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "締切に失敗しました。");
      }
    });
  }

  function reopen() {
    if (!state?.round) return;
    startTransition(async () => {
      try {
        await reopenBettingRound(state.round!.id);
        setResolvePicksDraft([]);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "再開に失敗しました。");
      }
    });
  }

  function resolve() {
    if (!state?.round) return;
    const labels = resolvePicksDraft.map((id) => state.round!.options.find((o) => o.id === id)?.label).join(" → ");
    if (!window.confirm(`「${labels}」を正解として確定します。よろしいですか？`)) return;
    startTransition(async () => {
      try {
        await resolveBettingRound(state.round!.id, resolvePicksDraft);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "結果発表に失敗しました。");
      }
    });
  }

  if (!state) {
    return <p className="text-xs text-bone-muted">読み込み中…</p>;
  }

  const { round, firstPickCounts, leaderboard, isHost, myUserId } = state;
  const totalFirstPicks = Object.values(firstPickCounts).reduce((a, b) => a + b, 0);
  const showCounts = round && round.status !== "open";
  const need = round ? MODE_PICK_COUNT[round.mode] : 1;

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      {round ? (
        <div className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-1 text-[10px] ${
                  round.status === "open"
                    ? "bg-fog-teal-dark text-[#9FE1CB]"
                    : round.status === "closed"
                      ? "bg-[#412402] text-[#FAC775]"
                      : "bg-blood-dark text-[#F5C4B3]"
                }`}
              >
                {STATUS_LABEL[round.status]}
              </span>
              <span className="rounded bg-[#3A1E52] px-2 py-1 text-[10px] text-[#D9C2F0]">
                {MODE_LABEL[round.mode]}（的中で{MODE_POINTS[round.mode]}pt）
              </span>
            </div>
            {totalFirstPicks > 0 && showCounts && (
              <span className="text-[10px] text-bone-muted">1着予想 計{totalFirstPicks}票</span>
            )}
          </div>
          <p className="mb-3 text-sm font-medium text-bone">{round.question}</p>

          {round.status === "resolved" && round.correctPicks && (
            <p className="mb-3 rounded-md border border-fog-teal bg-fog-teal-dark px-3 py-2 text-xs text-[#9FE1CB]">
              正解：{round.correctPicks.map((id) => round.options.find((o) => o.id === id)?.label ?? "?").join(" → ")}
            </p>
          )}

          {round.status === "open" && (
            <div className="space-y-2">
              <p className="text-[11px] text-bone-muted">
                {need === 1
                  ? "候補を1つ選んでください"
                  : `候補を選んだ順に${need}件タップしてください（${ORDINAL.slice(0, need).join("・")}の順）`}
              </p>
              <div className="flex flex-wrap gap-2">
                {round.options.map((opt) => {
                  const pickIndex = myPicksDraft.indexOf(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => togglePick(myPicksDraft, setMyPicksDraft, opt.id, need)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        pickIndex >= 0 ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] text-bone hover:border-[#444441]"
                      }`}
                    >
                      {pickIndex >= 0 && need > 1 && <span className="mr-1 font-bold">{pickIndex + 1}.</span>}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={isPending || myPicksDraft.length !== need}
                onClick={submitVote}
                className="mt-2 rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-50"
              >
                この予想で投票する
              </button>
            </div>
          )}

          {showCounts && round.status !== "resolved" && (
            <div className="space-y-1.5">
              {round.options.map((opt) => {
                const count = firstPickCounts[opt.id] ?? 0;
                const pct = totalFirstPicks > 0 ? Math.round((count / totalFirstPicks) * 100) : 0;
                return (
                  <div key={opt.id} className="relative overflow-hidden rounded-md border border-[#2C2C2A] px-3 py-1.5 text-xs">
                    <span className="absolute inset-y-0 left-0 bg-white/5" style={{ width: `${pct}%` }} aria-hidden />
                    <span className="relative flex items-center justify-between">
                      <span className="text-bone">{opt.label}</span>
                      <span className="text-[10px] text-bone-muted">1着予想 {count}票・{pct}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isHost && (
            <div className="mt-4 space-y-3 border-t border-[#2C2C2A] pt-3">
              {round.status === "open" && (
                <button onClick={close} className="rounded-lg border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted">
                  投票を締め切る
                </button>
              )}
              {round.status === "closed" && (
                <div>
                  <p className="mb-2 text-[11px] text-bone-muted">
                    正解を{ORDINAL.slice(0, need).join("・")}の順にタップして選んでください
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {round.options.map((opt) => {
                      const pickIndex = resolvePicksDraft.indexOf(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => togglePick(resolvePicksDraft, setResolvePicksDraft, opt.id, need)}
                          className={`rounded-md border px-3 py-1.5 text-xs ${
                            pickIndex >= 0 ? "border-fog-teal bg-fog-teal-dark text-[#9FE1CB]" : "border-[#2C2C2A] text-bone-muted"
                          }`}
                        >
                          {pickIndex >= 0 && need > 1 && <span className="mr-1 font-bold">{pickIndex + 1}.</span>}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={resolvePicksDraft.length !== need}
                      onClick={resolve}
                      className="rounded-lg bg-fog-teal-dark px-4 py-2 text-xs font-medium text-[#9FE1CB] disabled:opacity-50"
                    >
                      この結果で確定する
                    </button>
                    <button onClick={reopen} className="rounded-lg border border-[#2C2C2A] px-3 py-2 text-[11px] text-bone-muted">
                      投票を再開する
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-6 text-xs text-bone-muted">
          まだお題が出ていません。{isHost ? "下のフォームから最初のお題を作成してください。" : "配信者がお題を出すまでお待ちください。"}
        </p>
      )}

      {isHost && (
        <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
          <summary className="cursor-pointer text-xs font-medium text-bone">新しいお題を作る</summary>
          <div className="mt-3 space-y-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例：今回の試合、誰が最初にダウンする？"
              className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
            />

            <div className="flex gap-2">
              {(["win", "exacta", "trifecta"] as BettingMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1.5 text-[11px] ${
                    mode === m ? "bg-blood text-[#FCEBEB]" : "border border-[#2C2C2A] text-bone-muted"
                  }`}
                >
                  {MODE_LABEL[m]}（{MODE_POINTS[m]}pt）
                </button>
              ))}
            </div>

            {characters.length > 0 && (
              <details className="rounded-md border border-[#2C2C2A] p-2">
                <summary className="cursor-pointer text-[11px] text-bone-muted">
                  キラー/サバイバーから候補を選ぶ（{selectedCharacterIds.size}件選択中）
                </summary>
                <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCharacter(c.id)}
                      className={`rounded-md border px-2 py-1 text-[11px] ${
                        selectedCharacterIds.has(c.id) ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] text-bone-muted"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </details>
            )}

            <div className="space-y-2">
              <p className="text-[11px] text-bone-muted">自由入力の候補（キャラ以外の候補を追加したい場合）</p>
              {optionDrafts.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    value={o.label}
                    onChange={(e) => updateOptionDraft(o.id, e.target.value)}
                    placeholder={`候補${i + 1}`}
                    className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
                  />
                  {optionDrafts.length > 2 && (
                    <button onClick={() => removeOptionDraft(o.id)} className="text-bone-muted" aria-label="削除">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button onClick={addOptionDraft} className="text-[11px] text-bone-muted underline">
                + 候補を追加
              </button>
              <button
                disabled={isPending}
                onClick={submitNewRound}
                className="rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
              >
                このお題で開始する
              </button>
            </div>
          </div>
        </details>
      )}

      <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-bone">獲得ポイントランキング（この企画の累積）</p>
          <a href="/ranking" className="text-[10px] text-bone-muted underline">
            サイト全体のランキングを見る
          </a>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-[11px] text-bone-muted">まだ結果発表されたラウンドがありません。</p>
        ) : (
          <ol className="space-y-1.5">
            {leaderboard.map((row, i) => (
              <li
                key={row.userId}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                  row.userId === myUserId ? "bg-blood-dark text-[#F5C4B3]" : "text-bone"
                }`}
              >
                <span>
                  {i + 1}位　{row.name ?? "匿名視聴者"}
                  {row.userId === myUserId && <span className="ml-1 text-[10px]">（あなた）</span>}
                </span>
                <span className="text-bone-muted">{row.totalPoints}pt</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
