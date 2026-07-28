"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAdmin } from "./actions";

export function UserRow({
  user,
  isSelf,
}: {
  user: { id: string; name: string | null; email: string | null; isAdmin: boolean };
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggle() {
    setErrorMessage(null);
    const next = !user.isAdmin;
    if (next && !window.confirm(`「${user.name ?? user.email}」を管理者にします。よろしいですか？`)) return;
    startTransition(async () => {
      try {
        await toggleAdmin(user.id, next);
        router.refresh();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : "操作に失敗しました。");
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#2C2C2A] bg-ash p-4">
      <div>
        <p className="text-sm text-bone">
          {user.name ?? "（名前未設定）"}
          {isSelf && <span className="ml-2 text-[10px] text-bone-muted">（あなた）</span>}
        </p>
        <p className="text-[11px] text-bone-muted">{user.email ?? "メール未設定"}</p>
        {errorMessage && <p className="mt-1 text-[10px] text-[#ff8080]">{errorMessage}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded px-2 py-1 text-[10px] ${
            user.isAdmin ? "bg-blood-dark text-[#F5C4B3]" : "border border-[#2C2C2A] text-bone-muted"
          }`}
        >
          {user.isAdmin ? "管理者" : "一般"}
        </span>
        <button
          disabled={isPending || (isSelf && user.isAdmin)}
          onClick={toggle}
          className="rounded-md border border-[#2C2C2A] px-3 py-1.5 text-[11px] text-bone-muted disabled:opacity-40"
        >
          {user.isAdmin ? "管理者を外す" : "管理者にする"}
        </button>
      </div>
    </div>
  );
}
