import { cookies } from "next/headers";
import { safeAuthReturnPath } from "./redirects";
export const AUTH_RETURN_COOKIE = "motiion-auth-return";
export function serializeAuthReturn(userId: string, path: string) { return JSON.stringify({ userId, path }); }
export async function consumeAuthReturn(userId: string, fallback: string) {
  const store = await cookies();
  const raw = store.get(AUTH_RETURN_COOKIE)?.value;
  if (!raw) return fallback;
  store.delete(AUTH_RETURN_COOKIE);
  try { const value = JSON.parse(raw); return value.userId === userId ? safeAuthReturnPath(value.path) ?? fallback : fallback; } catch { return fallback; }
}
