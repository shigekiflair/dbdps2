import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getPublishedPlans() {
  return db.select().from(plans).where(eq(plans.isPublished, true)).orderBy(asc(plans.sortOrder));
}

export async function getPlanBySlug(slug: string) {
  const rows = await db.select().from(plans).where(eq(plans.slug, slug));
  return rows[0] ?? null;
}
