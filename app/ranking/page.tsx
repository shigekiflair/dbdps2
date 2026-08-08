import { getGlobalLeaderboard } from "@/lib/betting";
import { getCurrentIdentityId } from "@/lib/identity";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";

export default async function RankingPage() {
  const [leaderboard, myUserId, session] = await Promise.all([
    getGlobalLeaderboard(50),
    getCurrentIdentityId(),
    auth(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <SiteHeader active="ranking" />

      <div className="mb-4 flex gap-2">
        <span className="rounded-full border border-amber px-3 py-1 text-xs font-medium text-amber">
          ポイントランキング
        </span>
        <a href="/ranking/plans" className="rounded-full border border-[#2C2C2A] px-3 py-1 text-xs text-bone-muted">
          人気企画ランキング
        </a>
      </div>

      <h1 className="mb-1 text-lg font-medium text-bone">ポイントランキング</h1>
      <p className="mb-3 text-xs text-bone-muted">
        予想・ベッティング型企画で的中すると獲得できるポイントの、サイト全体での累積ランキングです。
      </p>

      {!session?.user?.id && (
        <div className="mb-6 rounded-lg border border-amber bg-[#2A1D08] px-4 py-3 text-xs text-amber">
          ポイントはログインしている人にだけ付与されます（未ログインだと的中してもポイントが付きません）。
          <a href="/login?callbackUrl=/ranking" className="ml-2 font-medium underline">
            ログインする
          </a>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="rounded-card border border-[#2C2C2A] bg-ash px-5 py-10 text-center text-xs text-bone-muted">
          まだ誰も獲得していません。予想・ベッティング型企画に参加してみましょう。
        </div>
      ) : (
        <ol className="space-y-1.5">
          {leaderboard.map((row, i) => (
            <li
              key={row.userId}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                row.userId === myUserId ? "border-blood bg-blood-dark text-[#F5C4B3]" : "border-[#2C2C2A] bg-ash text-bone"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-right text-bone-muted">{i + 1}</span>
                <span>
                  {row.name ?? "匿名視聴者"}
                  {row.userId === myUserId && <span className="ml-2 text-[10px] text-bone-muted">（あなた）</span>}
                </span>
              </span>
              <span className="font-medium">{row.totalPoints}pt</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
