"use client";

import { useState } from "react";

export function RoleplayTool({ items }: { items: string[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  function draw() {
    if (items.length === 0) return;
    const next = items[Math.floor(Math.random() * items.length)];
    setCurrent(next);
  }

  return (
    <div>
      <div className="mb-4 flex min-h-[88px] items-center justify-center rounded-lg border border-[#2C2C2A] bg-ash p-6 text-center">
        <p className="text-sm text-bone">{current ?? "ボタンを押して引いてください"}</p>
      </div>
      <button
        onClick={draw}
        className="w-full rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB]"
      >
        {current ? "もう一度引く" : "引く"}
      </button>
    </div>
  );
}
