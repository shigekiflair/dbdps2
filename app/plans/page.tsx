import { getPublishedPlans } from "@/lib/plans";
import { getFavoriteSlugs } from "@/lib/favorites";
import { getCurrentIdentityId } from "@/lib/identity";
import { PlanFilterBar } from "@/components/plan-filter-bar";
import { UserNav } from "@/components/user-nav";

export default async function PlansPage() {
  const identityId = await getCurrentIdentityId();
  const [plans, favoriteSlugs] = await Promise.all([
    getPublishedPlans(),
    getFavoriteSlugs(identityId),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium tracking-wide text-bone">TRIAL FORGE</span>
        <nav className="flex items-center gap-4 text-xs text-bone-muted">
          <a href="/plans/new">企画を作る</a>
          <a href="/mypage">マイページ</a>
          <a href="/tools">ツール</a>
          <UserNav />
        </nav>
      </header>

      <div className="mb-5 flex items-center justify-between rounded-card border border-[#2C2C2A] bg-ash px-5 py-4">
        <div>
          <p className="text-[11px] text-bone-muted">迷ったら</p>
          <p className="text-sm font-medium text-bone">おまかせ企画ガチャ</p>
        </div>
        <a
          href="/plans/random"
          className="rounded-lg bg-blood px-4 py-2 text-xs font-medium text-[#FCEBEB]"
        >
          ガチャる
        </a>
      </div>

      <PlanFilterBar plans={plans} favoriteSlugs={favoriteSlugs} />
    </main>
  );
}
