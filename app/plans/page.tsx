import { getPublishedPlans } from "@/lib/plans";
import { getFavoriteSlugs } from "@/lib/favorites";
import { getCurrentIdentityId } from "@/lib/identity";
import { getOpenReports } from "@/lib/reports";
import { auth } from "@/auth";
import { PlanFilterBar } from "@/components/plan-filter-bar";
import { UserNav } from "@/components/user-nav";

export default async function PlansPage() {
  const identityId = await getCurrentIdentityId();
  const session = await auth();
  const [plans, favoriteSlugs, openReports] = await Promise.all([
    getPublishedPlans(),
    getFavoriteSlugs(identityId),
    session?.user?.isAdmin ? getOpenReports() : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium tracking-wide text-bone">TRIAL FORGE</span>
        <nav className="flex items-center gap-4 text-xs text-bone-muted">
          <a href="/plans/new">企画を作る</a>
          <a href="/ranking">ランキング</a>
          {session?.user?.isAdmin && (
            <a href="/admin/reports" className="text-[#ff8080]">
              通報{openReports.length > 0 ? `（${openReports.length}）` : ""}
            </a>
          )}
          <a
            href="/mypage"
            className="rounded-full border border-amber px-3 py-1 font-medium text-amber"
          >
            マイページ
          </a>
          <a href="/tools">ツール</a>
          <UserNav />
        </nav>
      </header>

      <p className="mb-4 text-[11px] text-bone-muted">
        自分で作った企画（お気に入り・ティア表・投票企画など）は、この一覧ではなく
        <a href="/mypage" className="mx-1 text-amber underline">
          マイページ
        </a>
        にまとまって表示されます。
      </p>

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
