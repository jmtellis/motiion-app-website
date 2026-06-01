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

  const response = await fetch(`${config.supabaseUrl}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anon,
      Authorization: `Bearer ${config.anon}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new Error(message);
  }
  return data as T;
}
