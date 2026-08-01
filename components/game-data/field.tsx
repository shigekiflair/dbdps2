/** ゲームデータ管理フォーム用の共通ラベル付きフィールドラッパー。編集時(値が既に入っている時)でも何の項目か分かるようにする */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-bone-muted">{label}</span>
      {children}
    </label>
  );
}
