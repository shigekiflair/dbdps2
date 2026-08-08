import { db } from "@/db";
import { plans, planPlayDaily, planFavorites, planResults } from "@/db/schema";
import { and, eq, gte, isNull, sql } from "drizzle-orm";

/**
 * 企画の人気ランキング用スコア算出。
 *
 * - プレイ数スコア: 直近30日の plan_play_daily 合計（実際に「引く/実行する」操作の回数）
 * - お気に入りスコア: plan_favorites の件数
 * - シェアスコア: plan_results の件数（既存のシェア機能の利用回数）
 * - トレンドスコア: 直近7日のプレイ数を日次減衰させた値（急上昇ランキング用、総合スコアには含めない）
 *
 * 各スコアは企画間の最大値で正規化してから重み付け合算する。
 * 重みはここで一元管理する（プレイ数を最重視: 0.5 / お気に入り: 0.3 / シェア: 0.2）。
 *
 * 既知の制約: 現状は「実際に引く」操作（drawPlanResult / drawBuildSlot）のみをプレイ数として
 * 記録している。進捗トラッキング型・エスカレーション型など「引く」概念が無いタイプの利用状況は
 * まだこのスコアに反映されていない（チェック操作の連打でスコアが不当に膨らむのを避けるため、
 * 一旦様子見にしている。将来的に「1日1回まで」等の制限付きでカウント対象に加える余地はある）。
 */

const WEIGHTS = { play: 0.5, favorite: 0.3, share: 0.2 };
const PLAY_WINDOW_DAYS = 30;
const TREND_WINDOW_DAYS = 7;

export type PlanPopularity = {
  planId: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  playCount: number;
  favoriteCount: number;
  shareCount: number;
  trendCount: number;
  score: number;
};

function daysAgoDateString(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** 運営キュレーション企画(createdBy=null かつ公開済み)全件のスコアを算出する */
export async function getPlanPopularityRanking(): Promise<PlanPopularity[]> {
  const since30 = daysAgoDateString(PLAY_WINDOW_DAYS);
  const since7 = daysAgoDateString(TREND_WINDOW_DAYS);

  const [playRows, trendRows, favoriteRows, shareRows, planRows] = await Promise.all([
    db
      .select({ planId: planPlayDaily.planId, total: sql<number>`sum(${planPlayDaily.playCount})`.mapWith(Number) })
      .from(planPlayDaily)
      .where(gte(planPlayDaily.playDate, since30))
      .groupBy(planPlayDaily.planId),
    db
      .select({ planId: planPlayDaily.planId, total: sql<number>`sum(${planPlayDaily.playCount})`.mapWith(Number) })
      .from(planPlayDaily)
      .where(gte(planPlayDaily.playDate, since7))
      .groupBy(planPlayDaily.planId),
    db
      .select({ planId: planFavorites.planId, total: sql<number>`count(*)`.mapWith(Number) })
      .from(planFavorites)
      .groupBy(planFavorites.planId),
    db
      .select({ planId: planResults.planId, total: sql<number>`count(*)`.mapWith(Number) })
      .from(planResults)
      .groupBy(planResults.planId),
    db
      .select({ id: plans.id, slug: plans.slug, title: plans.title, description: plans.description, type: plans.type })
      .from(plans)
      .where(and(eq(plans.isPublished, true), isNull(plans.createdBy), isNull(plans.deletedAt))),
  ]);

  const playMap = new Map(playRows.map((r) => [r.planId, r.total]));
  const trendMap = new Map(trendRows.map((r) => [r.planId, r.total]));
  const favoriteMap = new Map(favoriteRows.map((r) => [r.planId, r.total]));
  const shareMap = new Map(shareRows.map((r) => [r.planId, r.total]));

  const maxPlay = Math.max(1, ...playRows.map((r) => r.total));
  const maxFavorite = Math.max(1, ...favoriteRows.map((r) => r.total));
  const maxShare = Math.max(1, ...shareRows.map((r) => r.total));

  const result: PlanPopularity[] = planRows.map((p) => {
    const playCount = playMap.get(p.id) ?? 0;
    const favoriteCount = favoriteMap.get(p.id) ?? 0;
    const shareCount = shareMap.get(p.id) ?? 0;
    const trendCount = trendMap.get(p.id) ?? 0;

    const score =
      (playCount / maxPlay) * WEIGHTS.play +
      (favoriteCount / maxFavorite) * WEIGHTS.favorite +
      (shareCount / maxShare) * WEIGHTS.share;

    return { planId: p.id, slug: p.slug, title: p.title, description: p.description, type: p.type, playCount, favoriteCount, shareCount, trendCount, score };
  });

  return result.sort((a, b) => b.score - a.score);
}

/** 直近7日のプレイ数が多い順（急上昇ランキング用） */
export async function getTrendingPlans(limit = 10): Promise<PlanPopularity[]> {
  const ranking = await getPlanPopularityRanking();
  return [...ranking].sort((a, b) => b.trendCount - a.trendCount).filter((p) => p.trendCount > 0).slice(0, limit);
}
