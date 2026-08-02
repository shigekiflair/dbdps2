"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { toggleAdmin, toggleCollaborator } from "./actions";

export function UserRow({
  user,
  isSelf,
}: {
  user: { id: string; name: string | null; email: string | null; isAdmin: boolean; isCollaborator: boolean };
  isSelf: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function toggleAdminRole() {
    setErrorMessage(null);
    const next = !user.isAdmin;
    if (next) {
      const ok = await confirm({
        message: `「${user.name ?? user.email}」を管理者にします。よろしいですか？`,
        confirmLabel: "管理者にする",
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const result = await toggleAdmin(user.id, next);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function toggleCollaboratorRole() {
    setErrorMessage(null);
    const next = !user.isCollaborator;
    if (next) {
      const ok = await confirm({
        message: `「${user.name ?? user.email}」をコラボレーター（ゲームデータ編集可）にします。よろしいですか？`,
        confirmLabel: "コラボレーターにする",
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const result = await toggleCollaborator(user.id, next);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-bone">
            {user.name ?? "（名前未設定）"}
            {isSelf && <span className="ml-2 text-[10px] text-bone-muted">（あなた）</span>}
          </p>
          <p className="text-[11px] text-bone-muted">{user.email ?? "メール未設定"}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded px-2 py-1 text-[10px] ${
              user.isAdmin ? "bg-blood-dark text-[#F5C4B3]" : "border border-[#2C2C2A] text-bone-muted"
            }`}
          >
            {user.isAdmin ? "管理者" : "一般"}
          </span>
          <button
            disabled={isPending || (isSelf && user.isAdmin)}
            onClick={toggleAdminRole}
            className="rounded-md border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted disabled:opacity-40"
          >
            {user.isAdmin ? "管理者を外す" : "管理者にする"}
          </button>
          <span
            className={`rounded px-2 py-1 text-[10px] ${
              user.isCollaborator ? "bg-[#3A1E52] text-[#D9C2F0]" : "border border-[#2C2C2A] text-bone-muted"
            }`}
          >
            {user.isCollaborator ? "コラボレーター" : "編集権限なし"}
          </span>
          <button
            disabled={isPending}
            onClick={toggleCollaboratorRole}
            className="rounded-md border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted disabled:opacity-40"
          >
            {user.isCollaborator ? "権限を外す" : "コラボレーターにする"}
          </button>
        </div>
      </div>
      {errorMessage && <p className="mt-2 text-[10px] text-[#ff8080]">{errorMessage}</p>}
    </div>
  );
}
