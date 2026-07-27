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
  correctOptionId: string | null;
};
type LeaderboardRow = { userId: string; correctCount: number; name: string | null; image: string | null };

type BettingState = {
  round: Round | null;
  myVote: string | null;
  voteCounts: Record<string, number>;
  leaderboard: LeaderboardRow[];
  isHost: boolean;
  myUserId: string | null;
};

const STATUS_LABEL: Record<RoundStatus, string> = {
  open: "投票受付中",
  closed: "投票締切・結果発表待ち",
  resolved: "結果発表済み",
};

function newOptionId() {
  return Math.random().toString(36).slice(2, 8);
}

export function BettingTool({ plan }: { plan: { slug: string } }) {
  const [state, setState] = useState<BettingState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 新規ラウンド作成フォーム（配信者用）
  const [question, setQuestion] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<BettingOption[]>([
    { id: newOptionId(), label: "" },
    { id: newOptionId(), label: "" },
  ]);

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
    // 視聴者・配信者どちらの画面でも、相手の操作(投票/締切/結果発表)を数秒遅れで反映するための簡易ポーリング。
    // Pusher等のリアルタイム基盤を導入するまでのつなぎとして、まずはこれで十分機能する
    const interval = window.setInterval(refresh, 6000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.slug]);

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

  function submitNewRound() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await openBettingRound(plan.slug, question, optionDrafts);
        setQuestion("");
        setOptionDrafts([
          { id: newOptionId(), label: "" },
          { id: newOptionId(), label: "" },
        ]);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "ラウンドの作成に失敗しました。");
      }
    });
  }

  function vote(optionId: string) {
    if (!state?.round || state.round.status !== "open") return;
    setErrorMessage(null);
    // 楽観的更新
    setState((prev) => (prev ? { ...prev, myVote: optionId } : prev));
    startTransition(async () => {
      try {
        await castBettingVote(state.round!.id, optionId);
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage("投票に失敗しました。もう一度お試しください。");
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
        refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "再開に失敗しました。");
      }
    });
  }

  function resolve(correctOptionId: string) {
    if (!state?.round) return;
    if (!window.confirm("この選択肢を正解として確定します。よろしいですか？")) return;
    startTransition(async () => {
      try {
        await resolveBettingRound(state.round!.id, correctOptionId);
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

  const { round, myVote, voteCounts, leaderboard, isHost, myUserId } = state;
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const showCounts = round && round.status !== "open";

  return (
    <div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark px-3 py-2 text-xs text-[#F5C4B3]">
          {errorMessage}
        </div>
      )}

      {/* --- 現在のお題 --- */}
      {round ? (
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
            {totalVotes > 0 && showCounts && (
              <span className="text-[10px] text-bone-muted">計{totalVotes}票</span>
            )}
          </div>
          <p className="mb-3 text-sm font-medium text-bone">{round.question}</p>

          <div className="space-y-2">
            {round.options.map((opt) => {
              const count = voteCounts[opt.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isMine = myVote === opt.id;
              const isCorrect = round.status === "resolved" && round.correctOptionId === opt.id;
              return (
                <div key={opt.id}>
                  <button
                    disabled={round.status !== "open" || isPending}
                    onClick={() => vote(opt.id)}
                    className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:cursor-default ${
                      isCorrect
                        ? "border-fog-teal bg-fog-teal-dark text-[#9FE1CB]"
                        : isMine
                          ? "border-blood text-bone"
                          : "border-[#2C2C2A] text-bone hover:border-[#444441]"
                    }`}
                  >
                    {showCounts && (
                      <span
                        className="absolute inset-y-0 left-0 bg-white/5"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    )}
                    <span className="relative flex items-center justify-between gap-2">
                      <span>
                        {isCorrect && "✔ "}
                        {opt.label}
                        {isMine && <span className="ml-2 text-[10px] text-bone-muted">（あなたの予想）</span>}
                      </span>
                      {showCounts && (
                        <span className="shrink-0 text-[10px] text-bone-muted">
                          {count}票・{pct}%
                        </span>
                      )}
                    </span>
                  </button>
                  {isHost && round.status === "closed" && (
                    <button
                      onClick={() => resolve(opt.id)}
                      className="mt-1 text-[10px] text-bone-muted underline"
                    >
                      これを正解にする
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {round.status === "open" && !myVote && (
            <p className="mt-3 text-center text-[11px] text-bone-muted">選択肢をタップして予想してください</p>
          )}

          {isHost && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#2C2C2A] pt-3">
              {round.status === "open" && (
                <button
                  onClick={close}
                  className="rounded-lg border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted"
                >
                  投票を締め切る
                </button>
              )}
              {round.status === "closed" && (
                <button
                  onClick={reopen}
                  className="rounded-lg border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted"
                >
                  投票を再開する
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-6 text-xs text-bone-muted">
          まだお題が出ていません。{isHost ? "下のフォームから最初のお題を作成してください。" : "配信者がお題を出すまでお待ちください。"}
        </p>
      )}

      {/* --- 配信者用: 新しいお題を作成 --- */}
      {isHost && (
        <details className="mb-6 rounded-lg border border-[#2C2C2A] bg-ash p-4">
          <summary className="cursor-pointer text-xs font-medium text-bone">
            {round && round.status !== "resolved" ? "新しいお題を作る（今のラウンドは上書きされません）" : "新しいお題を作る"}
          </summary>
          <div className="mt-3 space-y-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例：この試合、脱出人数は何人？"
              className="w-full rounded-md border border-[#2C2C2A] bg-ash2 px-3 py-2 text-xs text-bone placeholder:text-bone-muted"
            />
            <div className="space-y-2">
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
                このお題で開始する
              </button>
            </div>
          </div>
        </details>
      )}

      {/* --- 累積ランキング --- */}
      <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
        <p className="mb-3 text-xs font-medium text-bone">的中ランキング（この企画の累積）</p>
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
                <span className="text-bone-muted">{row.correctCount}的中</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
