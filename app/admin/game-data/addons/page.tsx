import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageGameData } from "@/lib/permissions";
import { getAllAddonsAdmin, getAllItemsForSelect } from "@/lib/game-data";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AddonManager } from "./addon-manager";

export default async function AddonsAdminPage() {
  const session = await auth();
  const allowed = canManageGameData(
    session?.user?.id
      ? { userId: session.user.id, isAdmin: !!session.user.isAdmin, isCollaborator: !!session.user.isCollaborator }
      : null
  );
  if (!allowed) redirect("/login?callbackUrl=/admin/game-data/addons");

  const [addons, items, killers] = await Promise.all([
    getAllAddonsAdmin(),
    getAllItemsForSelect(),
    db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.role, "killer")),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/admin/game-data" className="mb-4 inline-block text-xs text-bone-muted">
        ← ゲームデータ管理へ
      </a>
      <h1 className="mb-6 text-lg font-medium text-bone">アドオン</h1>
      <AddonManager addons={addons} killers={killers} items={items} />
    </main>
  );
}
