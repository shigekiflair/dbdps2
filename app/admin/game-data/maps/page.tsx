import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageGameData } from "@/lib/permissions";
import { getAllMapsAdmin } from "@/lib/game-data";
import { MapManager } from "./map-manager";

export default async function MapsAdminPage() {
  const session = await auth();
  const allowed = canManageGameData(
    session?.user?.id
      ? { userId: session.user.id, isAdmin: !!session.user.isAdmin, isCollaborator: !!session.user.isCollaborator }
      : null
  );
  if (!allowed) redirect("/login?callbackUrl=/admin/game-data/maps");

  const maps = await getAllMapsAdmin();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/admin/game-data" className="mb-4 inline-block text-xs text-bone-muted">
        ← ゲームデータ管理へ
      </a>
      <h1 className="mb-6 text-lg font-medium text-bone">マップ</h1>
      <MapManager maps={maps} />
    </main>
  );
}
