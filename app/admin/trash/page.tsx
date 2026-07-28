import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDeletedPlans } from "@/lib/plans";
import { TrashRow } from "./trash-row";

export default async function AdminTrashPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login?callbackUrl=/admin/trash");

  const deletedPlans = await getDeletedPlans();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans" className="mb-4 inline-block text-xs text-bone-muted">
        ← 企画一覧へ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">ゴミ箱</h1>
      <p className="mb-6 text-xs text-bone-muted">
        削除された企画（誤削除された場合はここから復元できます。管理者のみアクセスできます）。
      </p>

      {deletedPlans.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          ゴミ箱は空です。
        </div>
      ) : (
        <div className="space-y-3">
          {deletedPlans.map((p) => (
            <TrashRow key={p.id} plan={p} />
          ))}
        </div>
      )}
    </main>
  );
}
