"use client";

import { useState } from "react";

export function ChainTool({ missions }: { missions: string[] }) {
  const [index, setIndex] = useState(0);
  const done = index >= missions.length;

  return (
    <div>
      <p className="mb-3 text-xs text-bone-muted">
        {Math.min(index, missions.length)} / {missions.length} 達成
      </p>

      {!done ? (
        <div className="mb-4 rounded-lg border border-[#2C2C2A] bg-ash p-5 text-center">
          <p className="text-sm text-bone">{missions[index]}</p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-blood bg-blood-dark p-5 text-center">
          <p className="text-sm text-[#F5C4B3]">全ミッションクリア！</p>
        </div>
      )}

      <button
        onClick={() => (done ? setIndex(0) : setIndex((i) => i + 1))}
        className="w-full rounded-lg bg-blood py-2.5 text-xs font-medium text-[#FCEBEB]"
      >
        {done ? "最初からやり直す" : "達成した、次へ"}
      </button>
    </div>
  );
}
