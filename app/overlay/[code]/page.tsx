import { getResultByCode } from "@/lib/results";

type ResultPerk = { id: string; name: string; iconUrl: string | null };
type BuildPayload = {
  role: string;
  character: ResultPerk | null;
  perks: ResultPerk[];
};

export default async function OverlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await getResultByCode(code);
  if (!result) return null;

  const payload = result.resultPayload as ResultPerk[] | BuildPayload;
  const isBuild = !Array.isArray(payload) && payload && "character" in payload;
  const items: ResultPerk[] = isBuild
    ? [...(payload.character ? [payload.character] : []), ...payload.perks]
    : (payload as ResultPerk[]);

  return (
    <div style={{ display: "flex", gap: "12px", padding: "16px" }}>
      {items.map((p, i) => (
        <div
          key={p.id ?? i}
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "12px",
            padding: "12px 16px",
            textAlign: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <p style={{ color: "var(--tf-text-primary)", fontSize: "14px", fontWeight: 500, margin: 0 }}>
            {p.name}
          </p>
        </div>
      ))}
    </div>
  );
}
