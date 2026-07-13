"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { migrateAnonProgress } from "@/lib/migrate-anon";

export function AnonMigration() {
  const { status } = useSession();
  const migrated = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !migrated.current) {
      migrated.current = true;
      migrateAnonProgress();
    }
  }, [status]);

  return null;
}
