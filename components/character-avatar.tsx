"use client";

import { useState } from "react";

/**
 * キャラクターのアイコン表示。iconUrlが設定されていれば画像を表示し、
 * 無い場合・画像の読み込みに失敗した場合（ファイルがまだ用意されていない等）は、
 * キャラ名から決定的に色を生成した「仮アイコン」(頭文字バッジ)を表示する。
 * 実画像(スクショ等)が用意でき次第、charactersテーブルのicon_urlを実在するパスに更新すれば、
 * 自動的に仮アイコンから本物の画像表示に切り替わる。
 */

function hashToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

/**
 * DBに保存されたパスが "characters/xxx.png" のように先頭の"/"を欠いていると、
 * 今開いているページのパス基準で相対解決されてしまい(例: /plans/new/characters/xxx.png)、
 * 常に404になってしまう。サイトルート基準で解決されるよう防御的に正規化する。
 */
function normalizeIconUrl(iconUrl: string): string {
  if (/^(https?:)?\/\//.test(iconUrl) || iconUrl.startsWith("/")) return iconUrl;
  return `/${iconUrl}`;
}

export function CharacterAvatar({
  name,
  iconUrl,
  size = 28,
}: {
  name: string;
  iconUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizeIconUrl(iconUrl)}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  const hue = hashToHue(name);
  const initial = Array.from(name.trim())[0] ?? "?";

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: `hsl(${hue}, 45%, 32%)`,
        border: `1px solid hsl(${hue}, 45%, 45%)`,
      }}
    >
      {initial}
    </span>
  );
}
