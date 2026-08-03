import { auth } from "@/auth";
import { getOpenReports } from "@/lib/reports";
import { UserNav } from "@/components/user-nav";
import { AdminMenu } from "@/components/admin-menu";

type ActivePage = "plans" | "mypage" | "ranking";

const NAV_ITEMS: { page: ActivePage; href: string; label: string }[] = [
  { page: "plans", href: "/plans", label: "企画一覧" },
  { page: "ranking", href: "/ranking", label: "ランキング" },
  { page: "mypage", href: "/mypage", label: "マイページ" },
];

/**
 * 全ページ共通のヘッダー。狭い画面では横並びナビが潰れてタップしづらくなっていたため、
 * sm未満では「☰」でまとめて開閉する形にしている(JS不要のdetails/summaryで実装、AdminMenuと同じ発想)。
 */
export async function SiteHeader({ active }: { active?: ActivePage }) {
  const session = await auth();
  const openReports = session?.user?.isAdmin ? await getOpenReports() : [];

  return (
    <header className="mb-6 border-b border-[#2C2C2A] pb-4">
      <div className="flex items-center justify-between">
        <a href="/plans" className="text-sm font-medium tracking-wide text-bone">
          TRIAL FORGE
        </a>

        {/* デスクトップ/タブレット幅: 横並びナビ */}
        <nav className="hidden items-center gap-4 text-xs text-bone-muted sm:flex">
          {NAV_ITEMS.map((item) =>
            item.page === active ? (
              <span key={item.page} className="rounded-full border border-amber px-3 py-1 font-medium text-amber">
                {item.label}
              </span>
            ) : (
              <a key={item.page} href={item.href}>
                {item.label}
              </a>
            )
          )}
          <a href="/plans/new">企画を作る</a>
          <AdminMenu
            isAdmin={!!session?.user?.isAdmin}
            isCollaborator={!!session?.user?.isCollaborator}
            openReportsCount={openReports.length}
          />
          <UserNav />
        </nav>

        {/* スマホ幅: ハンバーガーメニューに集約 */}
        <details className="relative sm:hidden">
          <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-[#2C2C2A] text-bone">
            <span aria-hidden>☰</span>
            <span className="sr-only">メニューを開く</span>
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-56 space-y-1 rounded-lg border border-[#2C2C2A] bg-ash2 p-2 shadow-xl">
            {NAV_ITEMS.map((item) =>
              item.page === active ? (
                <span key={item.page} className="block rounded-md bg-[#2A1D08] px-3 py-2 text-xs font-medium text-amber">
                  {item.label}
                </span>
              ) : (
                <a key={item.page} href={item.href} className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
                  {item.label}
                </a>
              )
            )}
            <a href="/plans/new" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
              企画を作る
            </a>
            {(session?.user?.isAdmin || session?.user?.isCollaborator) && (
              <a href="/admin/game-data" className="block rounded-md px-3 py-2 text-xs text-[#D9C2F0] hover:bg-ash">
                ゲームデータ管理
              </a>
            )}
            {session?.user?.isAdmin && (
              <>
                <a href="/admin/reports" className="block rounded-md px-3 py-2 text-xs text-[#ff8080] hover:bg-ash">
                  通報の確認{openReports.length > 0 ? `（${openReports.length}）` : ""}
                </a>
                <a href="/admin/trash" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
                  ゴミ箱
                </a>
                <a href="/admin/users" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
                  管理者の管理
                </a>
              </>
            )}
            <div className="border-t border-[#2C2C2A] px-3 pt-2">
              <UserNav />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
