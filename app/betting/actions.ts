"use server";

import { auth } from "@/auth";
import { getPlanBySlug, getPlanById } from "@/lib/plans";
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
  getRoundPlanId,
  getRoundHistory,
  type BettingOption,
  type BettingMode,
} from "@/lib/betting";

/**
 * 「ホスト」＝サイト全体の管理者(isAdmin)、または、その企画自体を作った本人(plan.createdBy)。
 * 運営がキュレーションした企画(createdByがnull)はisAdminのみがホスト操作できる。
 */
async function isHostForPlan(createdBy: string | null): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.isAdmin) return true;
  return !!createdBy && createdBy === session.user.id;
}

async function requireHostBySlug(slug: string) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  if (!(await isHostForPlan(plan.createdBy))) {
    throw new Error("この操作は企画の作成者または配信者アカウントでのみ行えます");
  }
  return plan;
}

async function requireHostByRoundId(roundId: string) {
  const planId = await getRoundPlanId(roundId);
  if (!planId) throw new Error("round not found");
  const plan = await getPlanById(planId);
  if (!(await isHostForPlan(plan?.createdBy ?? null))) {
    throw new Error("この操作は企画の作成者または配信者アカウントでのみ行えます");
  }
}

export async function openBettingRound(
  slug: string,
  question: string,
  mode: BettingMode,
  options: BettingOption[]
) {
  const plan = await requireHostBySlug(slug);
  const cleanOptions = options.filter((o) => o.label.trim().length > 0);
  const minRequired = mode === "win" ? 2 : mode === "exacta" ? 3 : 4;
  if (cleanOptions.length < minRequired) {
    throw new Error(`候補を${minRequired}件以上入力してください`);
  }
  if (!question.trim()) throw new Error("お題を入力してください");
  await openRoundDb(plan.id, question.trim(), mode, cleanOptions);
}

export async function closeBettingRound(roundId: string) {
  await requireHostByRoundId(roundId);
  await closeRoundDb(roundId);
}

export async function reopenBettingRound(roundId: string) {
  await requireHostByRoundId(roundId);
  await reopenRoundDb(roundId);
}

export async function resolveBettingRound(roundId: string, correctPicks: string[]) {
  await requireHostByRoundId(roundId);
  await resolveRoundDb(roundId, correctPicks);
}

export async function castBettingVote(roundId: string, picks: string[]) {
  const identityId = await ensureCurrentIdentityId();
  await castVoteDb(roundId, identityId, picks);
}

/** ラウンドの現在状態・自分の投票・1着予想の人気度・ポイントランキング・過去の質問をまとめて取得する。ポーリングで定期的に呼び出す想定 */
export async function getBettingState(slug: string) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");

  const [round, session, leaderboard, hostOk] = await Promise.all([
    getLatestRound(plan.id),
    auth(),
    getLeaderboard(plan.id),
    isHostForPlan(plan.createdBy),
  ]);

  const identityId = await getCurrentIdentityId();
  const [myVote, firstPickCounts, history] = await Promise.all([
    round && identityId ? getMyVote(round.id, identityId) : Promise.resolve(null),
    round ? getFirstPickCounts(round.id) : Promise.resolve({}),
    round ? getRoundHistory(plan.id, round.id) : getRoundHistory(plan.id, ""),
  ]);

  return {
    round,
    myVote,
    firstPickCounts,
    leaderboard,
    history,
    isHost: hostOk,
    isLoggedIn: !!session?.user?.id,
    myUserId: identityId,
  };
}
