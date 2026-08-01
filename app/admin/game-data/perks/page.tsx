import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageGameData } from "@/lib/permissions";
import { getAllPerksAdmin, getAllCharactersAdmin } from "@/lib/game-data";
import { PerkManager } from "./perk-manager";

export default async function PerksAdminPage() {
  const session = await auth();
  const allowed = canManageGameData(
    session?.user?.id
      ? { userId: session.user.id, isAdmin: !!session.user.isAdmin, isCollaborator: !!session.user.isCollaborator }
      : null
  );
  if (!allowed) redirect("/login?callbackUrl=/admin/game-data/perks");

  const [perks, characters] = await Promise.all([getAllPerksAdmin(), getAllCharactersAdmin()]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/admin/game-data" className="mb-4 inline-block text-xs text-bone-muted">
        ← ゲームデータ管理へ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">パーク</h1>
      <p className="mb-6 text-xs text-bone-muted">
        コラボが終了して固有パークが共通パークになった場合は、該当パークの編集画面で「固有キャラ」を「共通パーク（固有キャラなし）」に変更してください。
      </p>
      <PerkManager perks={perks} characters={characters} />
    </main>
  );
}
