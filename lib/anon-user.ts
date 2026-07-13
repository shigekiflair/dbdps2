import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const ANON_COOKIE = "tf_anon_id";

/**
 * Server Component（読み取り専用の文脈）から呼ぶ用。
 * まだCookieが無い場合はnullを返すだけで、発行はしない。
 */
export async function getAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_COOKIE)?.value ?? null;
}

/**
 * Server Action内（Cookie書き込みが許可された文脈）でのみ呼ぶ。
 * 初回操作時にCookieを発行し、以降は同じIDを返す。
 *
 * Phase3でAuth.js導入後は、このIDに紐づくplan_progressを
 * ログイン済みuserIdへ引き継ぐ移行処理を追加する想定。
 */
export async function ensureAnonId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(ANON_COOKIE, id, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
  return id;
}
