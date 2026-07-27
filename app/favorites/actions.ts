"use server";

import { getPlanBySlug } from "@/lib/plans";
import { toggleFavorite } from "@/lib/favorites";
import { ensureCurrentIdentityId } from "@/lib/identity";

/** お気に入りのON/OFFを切り替える。返り値はトグル後の状態(true=お気に入り済み)。 */
export async function toggleFavoritePlan(slug: string): Promise<boolean> {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  const identityId = await ensureCurrentIdentityId();
  return toggleFavorite(plan.id, identityId);
}
