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
type RoundStatus = "open" | "closed" | "resolved";
type Round = {
  id: string;
  question: string;
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

const POINTS_PER_CORRECT = 10;

function newOptionId() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * YouTubeライブのアンケート機能に近いイメージのシンプルな1問1答型投票。
 * 「配信者が質問と選択肢を作る → 視聴者が1つ選んで投票 → 配信者が締め切る → 配信者が正解を選ぶ
 *  → 正解を選んでいた視聴者にポイントが付く」という一直線の流れだけを扱う。
 */
export function BettingTool({ plan, characters = [] }: { plan: { slug: string }; characters?: CharacterOption[] }) {
  const [state, setState] = useState<BettingState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<BettingOption[]>([
    { id: newOptionId(), label: "" },
    { id: newOptionId(), label: "" },
  ]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [characterQuery, setCharacterQuery] = useState("");

  const [myPick, setMyPick] = useState<string | null>(null);
  const [resolvePick, setResolvePick] = useState<string | null>(null);

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
    setMyPick(state?.myVote?.[0] ?? null);
  }, [state?.round?.id, state?.myVote]);

  function updateOptionDraft(id: string, label: string) {
    setOptionDrafts((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  }
  function addOptionDraft() {
    if (optionDrafts.length >= 8) return;
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
        await openBettingRound(plan.slug, question, "win", options);
        setQuestion("");
        setOptionDrafts([
          { id: newOptionId(), label: "" },
          { id: newOptionId(), label: "" },
        ]);
        setSelectedCharacterIds(new Set());
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "質問の作成に失敗しました。");
      }
    });
  }

  function submitVote() {
    if (!state?.round || !myPick) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await castBettingVote(state.round!.id, [myPick]);
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
        setResolvePick(null);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "再開に失敗しました。");
      }
    });
  }

  function resolve() {
    if (!state?.round || !resolvePick) return;
    const label = state.round.options.find((o) => o.id === resolvePick)?.label;
    if (!window.confirm(`「${label}」を正解として確定します。的中した視聴者に${POINTS_PER_CORRECT}pt付与されます。よろしいですか？`)) return;
    startTransition(async () => {
      try {
        await resolveBettingRound(state.round!.id, [resolvePick]);
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
  const totalVotes = Object.values(firstPickCounts).reduce((a, b) => a + b, 0);
  const showCounts = round && round.status !== "open";

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      {isHost && !round && (
        <p className="mb-3 text-[11px] text-bone-muted">
          YouTubeライブのアンケート機能のようなイメージです。質問と選択肢を作って公開すると、視聴者が1つ選んで投票できます。
        </p>
      )}

      {/* --- 現在の質問 --- */}
      {round && (
        <div className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
          <div className="mb-2 flex items-center justify-between">
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
            {totalVotes > 0 && showCounts && <span className="text-[10px] text-bone-muted">計{totalVotes}票</span>}
          </div>
          <p className="mb-3 text-sm font-medium text-bone">{round.question}</p>

          {round.status === "resolved" && round.correctPicks && (
            <p className="mb-3 rounded-md border border-fog-teal bg-fog-teal-dark px-3 py-2 text-xs text-[#9FE1CB]">
              正解：{round.options.find((o) => o.id === round.correctPicks![0])?.label ?? "?"}
              　的中した人に{POINTS_PER_CORRECT}pt付与しました
            </p>
          )}

          {/* 投票（openの間だけ操作可） */}
          {round.status === "open" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {round.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMyPick(opt.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      myPick === opt.id ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] text-bone hover:border-[#444441]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                disabled={isPending || !myPick}
                onClick={submitVote}
                className="mt-1 rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-50"
              >
                {state.myVote ? "投票を変更する" : "投票する"}
              </button>
            </div>
          )}

          {/* 締切後の得票表示 */}
          {showCounts && round.status !== "resolved" && (
            <div className="space-y-1.5">
              {round.options.map((opt) => {
                const count = firstPickCounts[opt.id] ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <div key={opt.id} className="relative overflow-hidden rounded-md border border-[#2C2C2A] px-3 py-1.5 text-xs">
                    <span className="absolute inset-y-0 left-0 bg-white/5" style={{ width: `${pct}%` }} aria-hidden />
                    <span className="relative flex items-center justify-between">
                      <span className="text-bone">{opt.label}</span>
                      <span className="text-[10px] text-bone-muted">{count}票・{pct}%</span>
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
                  <p className="mb-2 text-[11px] text-bone-muted">正解を1つ選んでください</p>
                  <div className="flex flex-wrap gap-2">
                    {round.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setResolvePick(opt.id)}
                        className={`rounded-md border px-3 py-1.5 text-xs ${
                          resolvePick === opt.id ? "border-fog-teal bg-fog-teal-dark text-[#9FE1CB]" : "border-[#2C2C2A] text-bone-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={!resolvePick}
                      onClick={resolve}
                      className="rounded-lg bg-fog-teal-dark px-4 py-2 text-xs font-medium text-[#9FE1CB] disabled:opacity-50"
                    >
                      この正解で確定する（的中者に{POINTS_PER_CORRECT}pt）
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
      )}

      {/* --- 配信者用: 質問を作る（お題が無いときは最初から開いた状態で表示） --- */}
      {isHost && (
        <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4" open={!round}>
          <summary className="cursor-pointer text-xs font-medium text-bone">
            {round ? "次の質問を作る" : "質問を作る"}
          </summary>
          <div className="mt-3 space-y-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例：今回脱出できるサバイバーは何人？"
              className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
            />

            {characters.length > 0 && (
              <details className="rounded-md border border-[#2C2C2A] p-2">
                <summary className="cursor-pointer text-[11px] text-bone-muted">
                  キラー/サバイバーから選択肢を選ぶ（{selectedCharacterIds.size}件選択中）
                </summary>
                <input
                  value={characterQuery}
                  onChange={(e) => setCharacterQuery(e.target.value)}
                  placeholder="キャラ名で検索"
                  className="mt-2 w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-1.5 text-[11px] text-bone placeholder:text-bone-muted"
                />
                <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {characters
                    .filter((c) => c.name.toLowerCase().includes(characterQuery.trim().toLowerCase()))
                    .map((c) => (
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
              <p className="text-[11px] text-bone-muted">選択肢（キャラ以外を追加したい場合はこちら）</p>
              {optionDrafts.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    value={o.label}
                    onChange={(e) => updateOptionDraft(o.id, e.target.value)}
                    placeholder={`選択肢${i + 1}`}
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
                + 選択肢を追加
              </button>
              <button
                disabled={isPending}
                onClick={submitNewRound}
                className="rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB] disabled:opacity-60"
              >
                この質問を公開する
              </button>
            </div>
          </div>
        </details>
      )}

      {/* --- 累積ポイントランキング --- */}
      <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-bone">獲得ポイントランキング（この企画の累積）</p>
          <a href="/ranking" className="text-[10px] text-bone-muted underline">
            サイト全体のランキングを見る
          </a>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-[11px] text-bone-muted">まだ結果発表された質問がありません。</p>
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
