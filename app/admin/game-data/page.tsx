import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageGameData } from "@/lib/permissions";
import { getAllCharactersAdmin, getAllPerksAdmin, getAllAddonsAdmin, getAllMapsAdmin } from "@/lib/game-data";

export default async function GameDataHubPage() {
  const session = await auth();
  const allowed = canManageGameData(
    session?.user?.id
      ? { userId: session.user.id, isAdmin: !!session.user.isAdmin, isCollaborator: !!session.user.isCollaborator }
      : null
  );
  if (!allowed) redirect("/login?callbackUrl=/admin/game-data");

  const [characters, perks, addons, maps] = await Promise.all([
    getAllCharactersAdmin(),
    getAllPerksAdmin(),
    getAllAddonsAdmin(),
    getAllMapsAdmin(),
  ]);

  const sections = [
    { href: "/admin/game-data/characters", label: "キラー / サバイバー", count: characters.length },
    { href: "/admin/game-data/perks", label: "パーク（固有↔共通の切り替えも可）", count: perks.length },
    { href: "/admin/game-data/addons", label: "アドオン", count: addons.length },
    { href: "/admin/game-data/maps", label: "マップ", count: maps.length },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans" className="mb-4 inline-block text-xs text-bone-muted">
        ← 企画一覧へ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">ゲームデータ管理</h1>
      <p className="mb-6 text-xs text-bone-muted">
        DBDのアップデートに合わせて、キラー・サバイバー・パーク・アドオン・マップを追加/編集できます。コラボキャラのパークが終了して共通パークになった場合は、パーク編集画面で「固有キャラ」を未選択にしてください。
      </p>

      <div className="space-y-3">
        {sections.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="flex items-center justify-between rounded-lg border border-[#2C2C2A] bg-ash p-4 hover:bg-ash2"
          >
            <span className="text-sm text-bone">{s.label}</span>
            <span className="text-xs text-bone-muted">{s.count}件</span>
          </a>
        ))}
      </div>
    </main>
  );
}
