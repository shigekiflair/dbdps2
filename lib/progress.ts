import { db } from "@/db";
import { planProgress } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getProgress(planId: string, userId: string) {
  const rows = await db
    .select()
    .from(planProgress)
    .where(and(eq(planProgress.planId, planId), eq(planProgress.userId, userId)));
  return rows[0] ?? null;
}

export async function upsertProgress(planId: string, userId: string, progressPayload: unknown) {
  const existing = await getProgress(planId, userId);
  if (existing) {
    await db
      .update(planProgress)
      .set({ progressPayload: progressPayload as any, updatedAt: new Date() })
      .where(eq(planProgress.id, existing.id));
  } else {
    await db.insert(planProgress).values({
      planId,
      userId,
      progressPayload: progressPayload as any,
    });
  }
}
