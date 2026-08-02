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
import { canHostPlan } from "@/lib/permissions";

/**
 * Server Actionは本番ビルドだとthrowしたErrorのメッセージが握りつぶされて汎用エラーになるため
 * (Next.jsの仕様。開発環境では気づけない)、バリデーション/権限エラーは例外ではなく戻り値で返す。
 * 呼び出し側は必ず`if (result?.error)`を先にチェックすること。
 */

/**
 * 「ホスト」＝サイト全体の管理者(isAdmin)、または、その企画自体を作った本人(plan.createdBy)。
 * 運営がキュレーションした企画(createdByがnull)はisAdminのみがホスト操作できる。
 * 実際の判定はセッション非依存の純粋関数canHostPlanに委譲している（lib/permissions.ts）。
 */
async function isHostForPlan(createdBy: string | null): Promise<boolean> {
  const session = await auth();
  return canHostPlan(
    session?.user?.id ? { userId: session.user.id, isAdmin: !!session.user.isAdmin } : null,
    createdBy
  );
}

const NOT_HOST_ERROR = "この操作は、この企画を作った本人か配信者本人だけが行えます";

async function checkHostBySlug(slug: string): Promise<{ error: string } | { planId: string }> {
  const plan = await getPlanBySlug(slug);
  if (!plan) return { error: "企画が見つかりません" };
  if (!(await isHostForPlan(plan.createdBy))) return { error: NOT_HOST_ERROR };
  return { planId: plan.id };
}

async function checkHostByRoundId(roundId: string): Promise<{ error: string } | { ok: true }> {
  const planId = await getRoundPlanId(roundId);
  if (!planId) return { error: "質問が見つかりません" };
  const plan = await getPlanById(planId);
  if (!(await isHostForPlan(plan?.createdBy ?? null))) return { error: NOT_HOST_ERROR };
  return { ok: true };
}

export async function openBettingRound(
  slug: string,
  question: string,
  mode: BettingMode,
  options: BettingOption[]
): Promise<{ error?: string }> {
  const hostCheck = await checkHostBySlug(slug);
  if ("error" in hostCheck) return hostCheck;

  const cleanOptions = options.filter((o) => o.label.trim().length > 0);
  const minRequired = mode === "win" ? 2 : mode === "exacta" ? 3 : 4;
  if (cleanOptions.length < minRequired) {
    return { error: `候補を${minRequired}件以上入力してください` };
  }
  if (!question.trim()) return { error: "お題を入力してください" };

  try {
    await openRoundDb(hostCheck.planId, question.trim(), mode, cleanOptions);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "質問の作成に失敗しました。" };
  }
}

export async function closeBettingRound(roundId: string): Promise<{ error?: string }> {
  const hostCheck = await checkHostByRoundId(roundId);
  if ("error" in hostCheck) return hostCheck;
  try {
    await closeRoundDb(roundId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "締切に失敗しました。" };
  }
}

export async function reopenBettingRound(roundId: string): Promise<{ error?: string }> {
  const hostCheck = await checkHostByRoundId(roundId);
  if ("error" in hostCheck) return hostCheck;
  try {
    await reopenRoundDb(roundId);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "再開に失敗しました。" };
  }
}

export async function resolveBettingRound(roundId: string, correctPicks: string[]): Promise<{ error?: string }> {
  const hostCheck = await checkHostByRoundId(roundId);
  if ("error" in hostCheck) return hostCheck;
  try {
    await resolveRoundDb(roundId, correctPicks);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "結果発表に失敗しました。" };
  }
}

export async function castBettingVote(roundId: string, picks: string[]): Promise<{ error?: string }> {
  try {
    const identityId = await ensureCurrentIdentityId();
    await castVoteDb(roundId, identityId, picks);
    return {};
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error ? err.message : "投票に失敗しました。" };
  }
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
