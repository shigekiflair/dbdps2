export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  // ルートレイアウト(app/layout.tsx)のhtml/bodyは維持したまま、
  // このセグメント配下だけ data-theme="overlay" で透過テーマを適用する。
  return (
    <div data-theme="overlay" style={{ background: "transparent", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
