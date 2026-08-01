"use client";

/**
 * 管理者/コラボレーター専用のまとめメニュー。
 * 実際のアクセス制御は各/admin/*ページ側のサーバーサイドチェックで行っているため、
 * ここでリンクを出す/出さないは利便性のためだけで、セキュリティ上の境界ではない。
 */
export function AdminMenu({
  isAdmin,
  isCollaborator,
  openReportsCount = 0,
}: {
  isAdmin: boolean;
  isCollaborator: boolean;
  openReportsCount?: number;
}) {
  if (!isAdmin && !isCollaborator) return null;

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full border border-[#5A3D7A] px-3 py-1 text-xs font-medium text-[#D9C2F0]">
        管理メニュー ▾
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-[#2C2C2A] bg-ash2 p-1.5 shadow-lg">
        {(isAdmin || isCollaborator) && (
          <a href="/admin/game-data" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
            ゲームデータ管理
          </a>
        )}
        {isAdmin && (
          <>
            <a href="/admin/reports" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
              通報の確認{openReportsCount > 0 ? `（${openReportsCount}）` : ""}
            </a>
            <a href="/admin/trash" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
              ゴミ箱
            </a>
            <a href="/admin/users" className="block rounded-md px-3 py-2 text-xs text-bone hover:bg-ash">
              管理者の管理
            </a>
          </>
        )}
      </div>
    </details>
  );
}
