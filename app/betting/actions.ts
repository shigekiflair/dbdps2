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
  getVoteCounts,
  getLeaderboard,
  type BettingOption,
} from "@/lib/betting";

async function requireHost() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("この操作は配信者アカウントでのみ行えます");
  }
}

export async function openBettingRound(slug: string, question: string, options: BettingOption[]) {
  await requireHost();
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const cleanOptions = options.filter((o) => o.label.trim().length > 0);
  if (cleanOptions.length < 2) throw new Error("選択肢は2つ以上入力してください");
  if (!question.trim()) throw new Error("お題を入力してください");
  await openRoundDb(plan.id, question.trim(), cleanOptions);
}

export async function closeBettingRound(roundId: string) {
  await requireHost();
  await closeRoundDb(roundId);
}

export async function reopenBettingRound(roundId: string) {
  await requireHost();
  await reopenRoundDb(roundId);
}

export async function resolveBettingRound(roundId: string, correctOptionId: string) {
  await requireHost();
  await resolveRoundDb(roundId, correctOptionId);
}

export async function castBettingVote(roundId: string, optionId: string) {
  const identityId = await ensureCurrentIdentityId();
  await castVoteDb(roundId, identityId, optionId);
}

/** ラウンドの現在状態・自分の投票・票数・ランキングをまとめて取得する。ポーリングで定期的に呼び出す想定 */
export async function getBettingState(slug: string) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");

  const [round, session, leaderboard] = await Promise.all([
    getLatestRound(plan.id),
    auth(),
    getLeaderboard(plan.id),
  ]);

  const identityId = await getCurrentIdentityId();
  const [myVote, voteCounts] = await Promise.all([
    round && identityId ? getMyVote(round.id, identityId) : Promise.resolve(null),
    round ? getVoteCounts(round.id) : Promise.resolve({}),
  ]);

  return {
    round,
    myVote,
    voteCounts,
    leaderboard,
    isHost: !!session?.user?.isAdmin,
    myUserId: identityId,
  };
}
