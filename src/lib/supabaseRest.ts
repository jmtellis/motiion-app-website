import { normalizeSupabaseUrl } from "@/lib/supabase/env";

export function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseUrl = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) return null;
  return { supabaseUrl, anon };
}

export async function supabaseRestGet<T>(
  path: string,
  options?: { revalidate?: number },
): Promise<T | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const url = `${config.supabaseUrl}/rest/v1/${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: config.anon,
        Authorization: `Bearer ${config.anon}`,
      },
      next: options?.revalidate !== undefined ? { revalidate: options.revalidate } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function callSupabaseFunction<T>(
  slug: string,
  body: Record<string, unknown>,
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${config.supabaseUrl}/functions/v1/${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anon,
        Authorization: `Bearer ${config.anon}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the booking server. Please try again in a moment.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const record = typeof data === "object" && data ? (data as Record<string, unknown>) : null;
    const message =
      record && typeof record.error === "string" ? record.error : "Request failed.";
    const errorCode = record && typeof record.errorCode === "string" ? record.errorCode : null;
    const err = new Error(message) as Error & { errorCode?: string };
    if (errorCode) err.errorCode = errorCode;
    throw err;
  }
  return data as T;
}
