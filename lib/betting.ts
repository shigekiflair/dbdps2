import { db } from "@/db";
import { bettingRounds, bettingVotes, pointTransactions, users } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { pickCountFor, pointsFor, reasonFor, isExactMatch, type BettingMode } from "@/lib/betting-rules";

export type BettingOption = { id: string; label: string };
export type { BettingMode };
export { pickCountFor };

export async function getRoundPlanId(roundId: string): Promise<string | null> {
  const rows = await db.select({ planId: bettingRounds.planId }).from(bettingRounds).where(eq(bettingRounds.id, roundId));
  return rows[0]?.planId ?? null;
}

export async function getLatestRound(planId: string) {
  const rows = await db
    .select()
    .from(bettingRounds)
    .where(eq(bettingRounds.planId, planId))
    .orderBy(desc(bettingRounds.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function openRound(planId: string, question: string, mode: BettingMode, options: BettingOption[]) {
  const rows = await db.insert(bettingRounds).values({ planId, question, mode, options }).returning();
  return rows[0];
}

export async function closeRound(roundId: string) {
  await db
    .update(bettingRounds)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(bettingRounds.id, roundId));
}

/** 再度投票を開くための取り消し操作（配信者が間違えて締切った場合など） */
export async function reopenRound(roundId: string) {
  await db
    .update(bettingRounds)
    .set({ status: "open", closedAt: null, resolvedAt: null, correctPicks: null })
    .where(eq(bettingRounds.id, roundId));
}

/**
 * 正解を確定し、順序完全一致した投票にだけポイントを付与する（競馬と同じく部分点なし）。
 * ポイントはpoint_transactionsに履歴として記録し、投票側にも参考値としてpointsAwardedを残す。
 */
export async function resolveRound(roundId: string, correctPicks: string[]) {
  const [round] = await db.select().from(bettingRounds).where(eq(bettingRounds.id, roundId));
  if (!round) throw new Error("round not found");
  const mode = round.mode as BettingMode;

  await db
    .update(bettingRounds)
    .set({ status: "resolved", correctPicks, resolvedAt: new Date() })
    .where(eq(bettingRounds.id, roundId));

  const votes = await db.select().from(bettingVotes).where(eq(bettingVotes.roundId, roundId));
  const points = pointsFor(mode);
  const reason = reasonFor(mode);

  // ポイントはログインユーザー(usersテーブルに実在するuserId)にのみ付与する。
  // 匿名Cookie IDはCookieを消せば何度でも投票し直せてしまうため、資産性のあるポイントの対象からは除外する
  const candidateUserIds = [...new Set(votes.map((v) => v.userId))];
  const registeredUserIds =
    candidateUserIds.length > 0
      ? new Set((await db.select({ id: users.id }).from(users).where(inArray(users.id, candidateUserIds))).map((u) => u.id))
      : new Set<string>();

  for (const vote of votes) {
    const picks = (vote.picks as string[]) ?? [];
    if (!isExactMatch(picks, correctPicks)) continue;
    if (!registeredUserIds.has(vote.userId)) continue; // 未ログイン(匿名)の的中にはポイントを付与しない

    await db.update(bettingVotes).set({ pointsAwarded: points }).where(eq(bettingVotes.id, vote.id));
    await db.insert(pointTransactions).values({
      userId: vote.userId,
      amount: points,
      reason,
      planId: round.planId,
      roundId: round.id,
    });
  }
}

/** 過去に締め切られた質問の履歴(最新のもの以外)。企画ページ内で振り返れるようにするため */
export async function getRoundHistory(planId: string, excludeRoundId: string, limit = 10) {
  const rows = await db
    .select()
    .from(bettingRounds)
    .where(eq(bettingRounds.planId, planId))
    .orderBy(desc(bettingRounds.createdAt))
    .limit(limit + 1);
  return rows.filter((r) => r.id !== excludeRoundId).slice(0, limit);
}

export async function castVote(roundId: string, userId: string, picks: string[]) {
  const [round] = await db.select().from(bettingRounds).where(eq(bettingRounds.id, roundId));
  if (!round) throw new Error("round not found");
  if (round.status !== "open") throw new Error("このラウンドは投票を締め切っています");

  const expected = pickCountFor(round.mode as BettingMode);
  if (picks.length !== expected) throw new Error(`${expected}件選択してください`);
  if (new Set(picks).size !== picks.length) throw new Error("同じ候補を重複して選ぶことはできません");

  await db
    .insert(bettingVotes)
    .values({ roundId, userId, picks })
    .onConflictDoUpdate({
      target: [bettingVotes.roundId, bettingVotes.userId],
      set: { picks },
    });
}

export async function getMyVote(roundId: string, userId: string): Promise<string[] | null> {
  const rows = await db
    .select({ picks: bettingVotes.picks })
    .from(bettingVotes)
    .where(and(eq(bettingVotes.roundId, roundId), eq(bettingVotes.userId, userId)));
  return (rows[0]?.picks as string[] | undefined) ?? null;
}

/** 「1位予想」の人気度だけを簡易集計する(2連単/3連単でも1着予想の傾向は分かるようにするため) */
export async function getFirstPickCounts(roundId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ picks: bettingVotes.picks })
    .from(bettingVotes)
    .where(eq(bettingVotes.roundId, roundId));
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const picks = (row.picks as string[]) ?? [];
    const first = picks[0];
    if (!first) continue;
    counts[first] = (counts[first] ?? 0) + 1;
  }
  return counts;
}

/** 企画(plan)ごとの累積獲得ポイントランキング */
export async function getLeaderboard(planId: string, limit = 20) {
  const rows = await db
    .select({
      userId: pointTransactions.userId,
      totalPoints: sql<number>`sum(${pointTransactions.amount})::int`,
      name: users.name,
    })
    .from(pointTransactions)
    .leftJoin(users, eq(pointTransactions.userId, users.id))
    .where(eq(pointTransactions.planId, planId))
    .groupBy(pointTransactions.userId, users.name)
    .orderBy(desc(sql`sum(${pointTransactions.amount})`))
    .limit(limit);
  return rows;
}

/** サイト全体の累積獲得ポイントランキング（/rankingページ用） */
export async function getGlobalLeaderboard(limit = 50) {
  const rows = await db
    .select({
      userId: pointTransactions.userId,
      totalPoints: sql<number>`sum(${pointTransactions.amount})::int`,
      name: users.name,
      image: users.image,
    })
    .from(pointTransactions)
    .leftJoin(users, eq(pointTransactions.userId, users.id))
    .groupBy(pointTransactions.userId, users.name, users.image)
    .orderBy(desc(sql`sum(${pointTransactions.amount})`))
    .limit(limit);
  return rows;
}
