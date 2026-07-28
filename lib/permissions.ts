/**
 * セッション取得・DB問い合わせを伴わない、純粋な権限判定ロジックだけを集めたファイル。
 * 「誰が何をできるか」を間違えると事故に直結するため、ここだけ切り出してユニットテストの対象にしている
 * （tests/permissions.test.ts）。
 */

export type MinimalSession = { userId: string | null; isAdmin: boolean } | null;

/**
 * ある企画に対して「ホスト操作(お題を出す・締切る・正解を確定する等)」ができるかどうか。
 * サイト全体の管理者(isAdmin)、または、その企画自体を作った本人(createdBy)のみtrue。
 * 運営がキュレーションした企画(createdByがnull)はisAdminのみがホスト操作できる。
 */
export function canHostPlan(session: MinimalSession, planCreatedBy: string | null): boolean {
  if (!session?.userId) return false;
  if (session.isAdmin) return true;
  return !!planCreatedBy && planCreatedBy === session.userId;
}

/**
 * 企画の閲覧可否。
 * - 運営キュレーション企画(createdBy=null): 常に閲覧可
 * - private: 作成者本人のみ
 * - unlisted / public: 誰でも閲覧可
 */
export function canViewPlan(
  plan: { createdBy: string | null; visibility: "private" | "unlisted" | "public" },
  viewerId: string | null
): boolean {
  if (!plan.createdBy) return true;
  if (plan.visibility === "private") return plan.createdBy === viewerId;
  return true;
}
