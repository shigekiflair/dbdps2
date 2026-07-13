"use client";

import { useState } from "react";

export function SharePageButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label="ページのリンクをコピー"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-[#2C2C2A] p-2 text-xs text-bone"
    >
      {copied ? "コピーしました" : "共有"}
    </button>
  );
}
