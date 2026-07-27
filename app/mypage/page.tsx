import { getFavoritePlans } from "@/lib/favorites";
import { getCurrentIdentityId } from "@/lib/identity";
import { PlanCard } from "@/components/plan-card";
import { UserNav } from "@/components/user-nav";

export default async function MyPage() {
  const identityId = await getCurrentIdentityId();
  const favoritePlans = identityId ? await getFavoritePlans(identityId) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <a href="/plans" className="text-sm font-medium tracking-wide text-bone">
          TRIAL FORGE
        </a>
        <nav className="flex items-center gap-4 text-xs text-bone-muted">
          <a href="/plans">企画一覧</a>
          <a href="/tools">ツール</a>
          <UserNav />
        </nav>
      </header>

      <h1 className="mb-1 text-lg font-medium text-bone">マイページ</h1>
      <p className="mb-6 text-xs text-bone-muted">
        お気に入りに登録した企画がここに並びます。ログインすると端末をまたいで引き継がれます。
      </p>

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
    </main>
  );
}
