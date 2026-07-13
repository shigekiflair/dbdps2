import { auth } from "@/auth";
import { getAnonId, ensureAnonId } from "@/lib/anon-user";

/**
 * 読み取り用（Server Component）。
 * ログイン中はsession.user.id、未ログインなら匿名Cookie（あれば）を返す。
 */
export async function getCurrentIdentityId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return getAnonId();
}

/**
 * 書き込み用（Server Action）。
 * ログイン中はsession.user.id、未ログインなら匿名Cookieを発行/取得して返す。
 */
export async function ensureCurrentIdentityId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return ensureAnonId();
}
