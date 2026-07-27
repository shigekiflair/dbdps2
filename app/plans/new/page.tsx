import { redirect } from "next/navigation";
import { auth } from "@/auth";

const STRING_LIST_TYPES: { type: string; label: string; description: string }[] = [
  { type: "trigger_internal", label: "イベントトリガー型", description: "セリフガチャ・お告げガチャ等、ボタンを押して1つ開示する企画" },
  { type: "chain", label: "連鎖・ミッションチェーン型", description: "順番にミッションをクリアしていく企画" },
  { type: "roleplay", label: "ロールプレイ型", description: "ランダムにお題を引く企画" },
  { type: "escalation", label: "エスカレーション型", description: "ポイントが貯まるとルールが追加される企画" },
  { type: "data_accumulation", label: "データ蓄積型", description: "カテゴリごとに回数を記録していく企画" },
  { type: "betting", label: "予想・ベッティング型", description: "配信中にお題を出し、視聴者が投票、後で正解を発表する企画" },
];

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/plans/new");

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/mypage" className="mb-4 inline-flex items-center gap-1 text-xs text-bone-muted">
        ← マイページへ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">企画を作る</h1>
      <p className="mb-6 text-xs text-bone-muted">作りたい企画のタイプを選んでください。</p>

      <div className="mb-3">
        <a
          href="/plans/new/tier-list"
          className="block rounded-lg border border-amber bg-ash p-4 hover:bg-ash2"
        >
          <p className="text-sm font-medium text-bone">ティア表</p>
          <p className="mt-1 text-xs text-bone-muted">
            キラーをS/A/B/C/D等のランクにドラッグ&ドロップで振り分けて公開する
          </p>
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STRING_LIST_TYPES.map((t) => (
          <a
            key={t.type}
            href={`/plans/new/list?type=${t.type}`}
            className="block rounded-lg border border-[#2C2C2A] bg-ash p-4 hover:bg-ash2"
          >
            <p className="text-sm font-medium text-bone">{t.label}</p>
            <p className="mt-1 text-xs text-bone-muted">{t.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
