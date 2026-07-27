import { db } from "@/db";
import { bettingRounds, bettingVotes, users } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export type BettingOption = { id: string; label: string };

export async function getLatestRound(planId: string) {
  const rows = await db
    .select()
    .from(bettingRounds)
    .where(eq(bettingRounds.planId, planId))
    .orderBy(desc(bettingRounds.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function openRound(planId: string, question: string, options: BettingOption[]) {
  const rows = await db.insert(bettingRounds).values({ planId, question, options }).returning();
  return rows[0];
}

export async function closeRound(roundId: string) {
  await db
    .update(bettingRounds)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(bettingRounds.id, roundId));
}

export async function resolveRound(roundId: string, correctOptionId: string) {
  await db
    .update(bettingRounds)
    .set({ status: "resolved", correctOptionId, resolvedAt: new Date() })
    .where(eq(bettingRounds.id, roundId));
}

/** 投票受付中のラウンドに再度投票を開くための取り消し操作（配信者が間違えて締切った場合など） */
export async function reopenRound(roundId: string) {
  await db
    .update(bettingRounds)
    .set({ status: "open", closedAt: null, resolvedAt: null, correctOptionId: null })
    .where(eq(bettingRounds.id, roundId));
}

export async function castVote(roundId: string, userId: string, optionId: string) {
  await db
    .insert(bettingVotes)
    .values({ roundId, userId, optionId })
    .onConflictDoUpdate({
      target: [bettingVotes.roundId, bettingVotes.userId],
      set: { optionId },
    });
}

export async function getMyVote(roundId: string, userId: string) {
  const rows = await db
    .select({ optionId: bettingVotes.optionId })
    .from(bettingVotes)
    .where(and(eq(bettingVotes.roundId, roundId), eq(bettingVotes.userId, userId)));
  return rows[0]?.optionId ?? null;
}

export async function getVoteCounts(roundId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ optionId: bettingVotes.optionId, count: sql<number>`count(*)::int` })
    .from(bettingVotes)
    .where(eq(bettingVotes.roundId, roundId))
    .groupBy(bettingVotes.optionId);
  return Object.fromEntries(rows.map((r) => [r.optionId, r.count]));
}

/**
 * 企画(plan)ごとの累積正解数ランキング。resolved済みの全ラウンドを対象に、
 * 投票したoptionIdがそのラウンドのcorrectOptionIdと一致した回数をuserIdごとに集計する。
 * 匿名視聴者はnameがnullになるため、表示側で「匿名視聴者」等に丸める。
 */
export async function getLeaderboard(planId: string, limit = 20) {
  const rows = await db
    .select({
      userId: bettingVotes.userId,
      correctCount: sql<number>`count(*)::int`,
      name: users.name,
      image: users.image,
    })
    .from(bettingVotes)
    .innerJoin(bettingRounds, eq(bettingVotes.roundId, bettingRounds.id))
    .leftJoin(users, eq(bettingVotes.userId, users.id))
    .where(
      and(
        eq(bettingRounds.planId, planId),
        eq(bettingRounds.status, "resolved"),
        eq(bettingVotes.optionId, bettingRounds.correctOptionId)
      )
    )
    .groupBy(bettingVotes.userId, users.name, users.image)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}
