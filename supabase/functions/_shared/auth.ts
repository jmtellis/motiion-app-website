import type { User } from "npm:@supabase/supabase-js@2.49.8";

/**
 * Resolve the current user from an access token via **Auth HTTP API only** (`GET /auth/v1/user`).
 *
 * Avoids:
 * - `service_role` `auth.getUser(jwt)` (local verify; HS256-only)
 * - `createClient(...).auth.getUser()` in some SDK paths (can still choke on ES256 before the request)
 *
 * Requires gateway `verify_jwt = false` for functions that pass user JWTs, or the platform rejects
 * ES256 tokens before this runs.
 */
async function userFromJwt(jwt: string): Promise<User | null> {
  const trimmed = jwt.trim();
  if (!trimmed) return null;

  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${trimmed}`,
        apikey: anonKey,
      },
    });
  } catch (err) {
    console.error("auth/v1/user fetch error", err);
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.warn("auth/v1/user failed", { status: res.status, body: text.slice(0, 300) });
    return null;
  }

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error("auth/v1/user invalid JSON", err);
    return null;
  }
  const raw = body["user"] ?? body;
  if (!raw || typeof raw !== "object") return null;
  const user = raw as User;
  if (typeof user.id !== "string") return null;
  return user;
}

/**
 * Resolves the caller's user from JWT.
 *
 * The Functions `Authorization` header is sometimes still the anon/publishable JWT (SDK default)
 * until the client syncs the session token. In that case `getUser` on the header fails; we must
 * try `fallbackJwt` (e.g. from JSON body) instead of only when the header is absent.
 */
export async function getAuthenticatedUser(req: Request, fallbackJwt?: string | null) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  let headerJwt: string | null = null;
  if (authHeader) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) headerJwt = bearerMatch[1].trim();
  }

  const fallback = fallbackJwt?.trim() || null;

  if (headerJwt) {
    const user = await userFromJwt(headerJwt);
    if (user) return user;
  }

  if (fallback && fallback !== headerJwt) {
    return await userFromJwt(fallback);
  }

  return null;
}
