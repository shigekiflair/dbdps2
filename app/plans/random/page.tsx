import { redirect } from "next/navigation";
import { getPublishedPlans } from "@/lib/plans";

export default async function RandomPlanPage() {
  const plans = await getPublishedPlans();
  if (plans.length === 0) redirect("/plans");

  const pick = plans[Math.floor(Math.random() * plans.length)];
  redirect(`/plans/${pick.slug}`);
}
