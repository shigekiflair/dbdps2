"use server";

import { getPlanBySlug } from "@/lib/plans";
import { getCurrentIdentityId } from "@/lib/identity";
import { createReport } from "@/lib/reports";

export async function reportPlan(slug: string, reason: string) {
  const plan = await getPlanBySlug(slug);
  if (!plan) throw new Error("plan not found");
  if (!reason.trim()) throw new Error("通報理由を入力してください");
  const identityId = await getCurrentIdentityId();
  await createReport(plan.id, identityId, reason);
}
