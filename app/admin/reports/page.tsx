import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOpenReports } from "@/lib/reports";
import { ReportRow } from "./report-row";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login?callbackUrl=/admin/reports");

  const reports = await getOpenReports();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <a href="/plans" className="mb-4 inline-block text-xs text-bone-muted">
        ← 企画一覧へ
      </a>
      <h1 className="mb-1 text-lg font-medium text-bone">通報の確認</h1>
      <p className="mb-6 text-xs text-bone-muted">未対応の通報一覧です（管理者のみアクセスできます）。</p>

      {reports.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          未対応の通報はありません。
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </main>
  );
}
