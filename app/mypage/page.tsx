import { getFavoritePlans } from "@/lib/favorites";
import { getUserPlans } from "@/lib/plans";
import { getCurrentIdentityId } from "@/lib/identity";
import { getOpenReports } from "@/lib/reports";
import { auth } from "@/auth";
import { PlanCard } from "@/components/plan-card";
import { MyPlanCard } from "@/components/my-plan-card";
import { UserNav } from "@/components/user-nav";
import { AdminMenu } from "@/components/admin-menu";

export default async function MyPage() {
  const identityId = await getCurrentIdentityId();
  const session = await auth();
  const [favoritePlans, myPlans, openReports] = await Promise.all([
    identityId ? getFavoritePlans(identityId) : Promise.resolve([]),
    session?.user?.id ? getUserPlans(session.user.id) : Promise.resolve([]),
    session?.user?.isAdmin ? getOpenReports() : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <a href="/plans" className="text-sm font-medium tracking-wide text-bone">
          TRIAL FORGE
        </a>
        <nav className="flex items-center gap-4 text-xs text-bone-muted">
          <a href="/plans">企画一覧</a>
          <a href="/ranking">ランキング</a>
          <span className="rounded-full border border-amber px-3 py-1 font-medium text-amber">マイページ</span>
          <a href="/tools">ツール</a>
          <AdminMenu
            isAdmin={!!session?.user?.isAdmin}
            isCollaborator={!!session?.user?.isCollaborator}
            openReportsCount={openReports.length}
          />
          <UserNav />
        </nav>
      </header>

      <h1 className="mb-1 text-lg font-medium text-bone">マイページ</h1>
      <p className="mb-3 text-xs text-bone-muted">
        お気に入りに登録した企画がここに並びます。ログインすると端末をまたいで引き継がれます。
      </p>

      {!session?.user?.id && (
        <div className="mb-6 rounded-lg border border-amber bg-[#2A1D08] px-4 py-3 text-xs text-amber">
          今はログインしていません。この状態だとブラウザのCookieを消したり別の端末を使うと、お気に入り・獲得ポイントが引き継がれません。
          <a href="/login?callbackUrl=/mypage" className="ml-2 font-medium underline">
            ログインする
          </a>
        </div>
      )}

      {favoritePlans.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          まだお気に入りに追加した企画がありません。
          <br />
          <a href="/plans" className="mt-3 inline-block text-bone underline">
            企画一覧からカードの☆ボタンで追加できます
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favoritePlans.map((p) => (
            <PlanCard key={p.slug} plan={p} favorited />
          ))}
        </div>
      )}

      <div className="mb-4 mt-10 flex items-center justify-between border-t border-[#2C2C2A] pt-8">
        <h2 className="text-sm font-medium text-bone">自分の企画</h2>
        {session?.user?.id && (
          <a href="/plans/new" className="rounded-lg bg-blood px-3 py-1.5 text-xs font-medium text-[#FCEBEB]">
            + 新しい企画を作る
          </a>
        )}
      </div>

      {!session?.user?.id ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          企画を作るにはログインが必要です。
          <br />
          <a href="/login?callbackUrl=/plans/new" className="mt-3 inline-block text-bone underline">
            ログインする
          </a>
        </div>
      ) : myPlans.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          まだ企画を作成していません。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myPlans.map((p) => (
            <MyPlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </main>
  );
}
