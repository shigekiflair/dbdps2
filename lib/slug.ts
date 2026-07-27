import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq } from "drizzle-orm";

/** 日本語タイトルにも対応した緩いslug化。英数字が無い場合は"plan"にフォールバックする */
function baseSlugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii.length > 0 ? ascii.slice(0, 40) : "plan";
}

/** 既存slugと衝突しないユニークなslugを発行する（衝突したら -2, -3... と連番を付ける） */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = baseSlugify(title);
  let candidate = base;
  let suffix = 2;

  // 大量に衝突することは想定しにくいが、安全のため最大50回まで
  for (let i = 0; i < 50; i++) {
    const rows = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, candidate)).limit(1);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now()}`;
}
