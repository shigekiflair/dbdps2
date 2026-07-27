"use server";

import { auth } from "@/auth";
import { getPlanBySlug } from "@/lib/plans";
import { ensureCurrentIdentityId, getCurrentIdentityId } from "@/lib/identity";
import {
  openRound as openRoundDb,
  closeRound as closeRoundDb,
  resolveRound as resolveRoundDb,
  reopenRound as reopenRoundDb,
  castVote as castVoteDb,
  getLatestRound,
  getMyVote,
  getFirstPickCounts,
  getLeaderboard,
  type BettingOption,
  type BettingMode,
} from "@/lib/betting";

async function requireHost() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("この操作は配信者アカウントでのみ行えます");
  }
}

export async function openBettingRound(
  slug: string,
  question: string,
  mode: BettingMode,
  options: BettingOption[]
) {
  await requireHost();
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const cleanOptions = options.filter((o) => o.label.trim().length > 0);
  const minRequired = mode === "win" ? 2 : mode === "exacta" ? 3 : 4;
  if (cleanOptions.length < minRequired) {
    throw new Error(`候補を${minRequired}件以上入力してください`);
  }
  if (!question.trim()) throw new Error("お題を入力してください");
  await openRoundDb(plan.id, question.trim(), mode, cleanOptions);
}

export async function closeBettingRound(roundId: string) {
  await requireHost();
  await closeRoundDb(roundId);
}

export async function reopenBettingRound(roundId: string) {
  await requireHost();
  await reopenRoundDb(roundId);
}

export async function resolveBettingRound(roundId: string, correctPicks: string[]) {
  await requireHost();
  await resolveRoundDb(roundId, correctPicks);
}

export async function castBettingVote(roundId: string, picks: string[]) {
  const identityId = await ensureCurrentIdentityId();
  await castVoteDb(roundId, identityId, picks);
}

/** ラウンドの現在状態・自分の投票・1着予想の人気度・ポイントランキングをまとめて取得する。ポーリングで定期的に呼び出す想定 */
export async function getBettingState(slug: string) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");

  const [round, session, leaderboard] = await Promise.all([
    getLatestRound(plan.id),
    auth(),
    getLeaderboard(plan.id),
  ]);

  const identityId = await getCurrentIdentityId();
  const [myVote, firstPickCounts] = await Promise.all([
    round && identityId ? getMyVote(round.id, identityId) : Promise.resolve(null),
    round ? getFirstPickCounts(round.id) : Promise.resolve({}),
  ]);

  return {
    round,
    myVote,
    firstPickCounts,
    leaderboard,
    isHost: !!session?.user?.isAdmin,
    myUserId: identityId,
  };
}
