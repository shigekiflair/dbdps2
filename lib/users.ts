import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getAllUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, isAdmin: users.isAdmin })
    .from(users)
    .orderBy(desc(users.isAdmin));
}

export async function setAdminStatus(targetUserId: string, isAdmin: boolean) {
  await db.update(users).set({ isAdmin }).where(eq(users.id, targetUserId));
}
