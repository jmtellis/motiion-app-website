export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function normalizeSupabaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/$/, "");
  try {
    const parsed = new URL(trimmed);
    // Common misconfiguration: https://www.<ref>.supabase.co does not resolve.
    if (parsed.hostname.startsWith("www.") && parsed.hostname.endsWith(".supabase.co")) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export function getSupabaseEnv() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { supabaseUrl, supabaseAnonKey };
}
