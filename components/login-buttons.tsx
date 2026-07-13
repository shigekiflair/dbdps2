"use client";

import { signIn } from "next-auth/react";

export function LoginButtons() {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => signIn("twitch", { callbackUrl: "/plans" })}
        className="rounded-lg bg-[#9146FF] py-2.5 text-xs font-medium text-white"
      >
        Twitchでログイン
      </button>
      <button
        onClick={() => signIn("google", { callbackUrl: "/plans" })}
        className="rounded-lg border border-[#2C2C2A] py-2.5 text-xs font-medium text-bone"
      >
        Googleでログイン
      </button>
    </div>
  );
}
