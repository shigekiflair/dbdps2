import { getPlanPopularityRanking, getTrendingPlans } from "@/lib/ranking";
import { getFavoriteSlugs } from "@/lib/favorites";
import { getCurrentIdentityId } from "@/lib/identity";
import { PlanCard } from "@/components/plan-card";
import { SiteHeader } from "@/components/site-header";

export default async function PlanRankingPage() {
  const identityId = await getCurrentIdentityId();
  const [ranking, trending, favoriteSlugs] = await Promise.all([
    getPlanPopularityRanking(),
    getTrendingPlans(6),
    getFavoriteSlugs(identityId),
  ]);

  const favoriteSet = new Set(favoriteSlugs);
  const trendingSlugSet = new Set(trending.map((t) => t.slug));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <SiteHeader active="ranking" />

      <div className="mb-4 flex gap-2">
        <a href="/ranking" className="rounded-full border border-[#2C2C2A] px-3 py-1 text-xs text-bone-muted">
          ポイントランキング
        </a>
        <span className="rounded-full border border-amber px-3 py-1 text-xs font-medium text-amber">
          人気企画ランキング
        </span>
      </div>

      <h1 className="mb-1 text-lg font-medium text-bone">人気企画ランキング</h1>
      <p className="mb-6 text-xs text-bone-muted">
        プレイ数(50%)・お気に入り数(30%)・シェア数(20%)を組み合わせた総合スコアの順位です。
      </p>

      {trending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-medium text-amber">🔥 直近7日の急上昇</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {trending.map((p) => (
              <PlanCard
                key={p.slug}
                plan={p}
                favorited={favoriteSet.has(p.slug)}
                rankBadge="🔥トレンド中"
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium text-bone-muted">総合ランキング</h2>
        {ranking.length === 0 ? (
          <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
            まだプレイ実績のある企画がありません。
          </div>
        ) : (
          <ol className="space-y-1.5">
            {ranking.slice(0, 30).map((p, i) => (
              <li key={p.slug} className="rounded-lg border border-[#2C2C2A] bg-ash px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-right text-sm text-bone-muted">{i + 1}</span>
                    <a href={`/plans/${p.slug}`} className="truncate text-sm text-bone hover:underline">
                      {p.title}
                      {trendingSlugSet.has(p.slug) && <span className="ml-1.5 text-[10px] text-amber">🔥</span>}
                    </a>
                  </div>
                  <span className="shrink-0 text-[10px] text-bone-muted">
                    プレイ{p.playCount} / ★{p.favoriteCount} / 共有{p.shareCount}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
