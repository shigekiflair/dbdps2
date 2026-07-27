"use client";

import { useState, useTransition } from "react";
import { toggleFavoritePlan } from "@/app/favorites/actions";

export function FavoriteButton({
  slug,
  initialFavorited,
  size = "sm",
}: {
  slug: string;
  initialFavorited: boolean;
  size?: "sm" | "md";
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    // カード全体がLinkでラップされているケースがあるため遷移を止める
    e.preventDefault();
    e.stopPropagation();

    const next = !favorited;
    setFavorited(next); // 楽観的更新
    startTransition(async () => {
      try {
        const result = await toggleFavoritePlan(slug);
        setFavorited(result);
      } catch (err) {
        console.error(err);
        setFavorited(!next); // 失敗したら元に戻す
      }
    });
  }

  const dim = size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-base";

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? "お気に入りから外す" : "お気に入りに追加"}
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full border transition-colors ${
        favorited
          ? "border-amber bg-[#2A1D08] text-amber"
          : "border-[#2C2C2A] text-bone-muted hover:border-[#444441] hover:text-bone"
      } disabled:opacity-60`}
    >
      {favorited ? "★" : "☆"}
    </button>
  );
}
