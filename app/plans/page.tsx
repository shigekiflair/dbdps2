import { getPublishedPlans } from "@/lib/plans";
import { getFavoriteSlugs } from "@/lib/favorites";
import { getCurrentIdentityId } from "@/lib/identity";
import { getOpenReports } from "@/lib/reports";
import { auth } from "@/auth";
import { PlanFilterBar } from "@/components/plan-filter-bar";
import { UserNav } from "@/components/user-nav";
import { AdminMenu } from "@/components/admin-menu";

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
      <header className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium tracking-wide text-bone">TRIAL FORGE</span>
        <nav className="flex items-center gap-4 text-xs text-bone-muted">
          <a href="/plans/new">企画を作る</a>
          <a href="/ranking">ランキング</a>
          <a
            href="/mypage"
            className="rounded-full border border-amber px-3 py-1 font-medium text-amber"
          >
            マイページ
          </a>
          <AdminMenu
            isAdmin={!!session?.user?.isAdmin}
            isCollaborator={!!session?.user?.isCollaborator}
            openReportsCount={openReports.length}
          />
          <UserNav />
        </nav>
      </header>
      <p className="mb-5 text-[11px] text-bone-muted">Dead by Daylight 配信企画ポータル</p>

      <div className="mb-5 rounded-card border border-[#2C2C2A] bg-ash px-5 py-4 text-xs leading-relaxed text-bone-muted">
        投票・ティア表・チャレンジなどの企画で遊べる場所です。下の一覧から気になる企画を選ぶだけで、
        <span className="text-bone">ログイン不要ですぐに参加</span>できます。ログインすると、投票の記録やポイントが端末をまたいで残るほか、
        <a href="/plans/new" className="text-amber underline">
          誰でも自分の企画を作る
        </a>
        こともできます。
      </div>

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
