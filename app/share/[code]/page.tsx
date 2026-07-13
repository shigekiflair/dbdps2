import { notFound } from "next/navigation";
import { getResultByCode } from "@/lib/results";

type ResultPerk = { id: string; name: string; iconUrl: string | null };
type BuildPayload = {
  role: string;
  character: ResultPerk | null;
  perks: ResultPerk[];
};

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await getResultByCode(code);
  if (!result) notFound();

  const payload = result.resultPayload as ResultPerk[] | BuildPayload;
  const isBuild = !Array.isArray(payload) && payload && "character" in payload;
  const items: ResultPerk[] = isBuild
    ? [...(payload.character ? [payload.character] : []), ...payload.perks]
    : (payload as ResultPerk[]);

  return (
    <main className="mx-auto max-w-md px-6 py-10 text-center">
      <p className="mb-1 text-[11px] text-bone-muted">TRIAL FORGE</p>
      <h1 className="mb-6 text-lg font-medium text-bone">今回の抽選結果</h1>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div key={p.id ?? i} className="rounded-lg border border-[#2C2C2A] bg-ash p-4">
            <div className="mx-auto mb-2 h-10 w-10 rounded bg-ash2" />
            <p className="text-xs text-bone">{p.name}</p>
          </div>
        ))}
      </div>
      <a href="/plans" className="mt-8 inline-block text-[11px] text-bone-muted underline">
        自分でも企画を試す
      </a>
    </main>
  );
}
