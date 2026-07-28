import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllUsers } from "@/lib/users";
import { UserRow } from "./user-row";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login?callbackUrl=/admin/users");

  const allUsers = await getAllUsers();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans" className="mb-4 inline-block text-xs text-bone-muted">
        ← 企画一覧へ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">管理者の管理</h1>
      <p className="mb-6 text-xs text-bone-muted">
        ログインしたことのあるユーザー一覧です。管理者にすると、その人はどの企画のホスト操作（予想のお題作成・締切・正解確定）も、通報の確認・企画の削除もできるようになります。信頼できる人にだけ付与してください。
      </p>

      {allUsers.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          まだ誰もログインしたことがありません。
        </div>
      ) : (
        <div className="space-y-3">
          {allUsers.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === session.user.id} />
          ))}
        </div>
      )}
    </main>
  );
}
