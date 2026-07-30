/**
 * キャラクターのアイコン表示。iconUrlが設定されていれば画像を表示し、
 * 無ければキャラ名から決定的に色を生成した「仮アイコン」(頭文字バッジ)を表示する。
 * 実画像(スクショ等)が用意でき次第、charactersテーブルのicon_urlを埋めるだけで自動的に画像表示に切り替わる。
 */

function hashToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
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
  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={iconUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
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
