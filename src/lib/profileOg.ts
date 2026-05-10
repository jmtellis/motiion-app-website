/** Match app share URLs: username or auth user UUID (lowercase). */
export const PROFILE_SLUG_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeUsernameSlug(raw: string): string {
  return decodeURIComponent(raw)
    .trim()
    .toLowerCase()
    .replace(/^@+/u, "")
    .replace(/[^a-z0-9_]/gu, "")
    .slice(0, 30);
}

export function profileOgImageUrl(slug: string): string {
  const base = profileOgBaseUrl();
  const trimmed = decodeURIComponent(slug).trim();
  if (PROFILE_SLUG_UUID_RE.test(trimmed)) {
    const id = trimmed.toLowerCase();
    return `${base}?userId=${encodeURIComponent(id)}`;
  }
  const user = normalizeUsernameSlug(trimmed);
  return user.length > 0
    ? `${base}?username=${encodeURIComponent(user)}`
    : base;
}

function profileOgBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_PROFILE_OG_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_PROFILE_OG_BASE_URL is required");
  }
  return `${supabaseUrl}/functions/v1/profile-og`;
}

export async function fetchPublicTalentName(slug: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) return null;

  const trimmed = decodeURIComponent(slug).trim();
  const isUuid = PROFILE_SLUG_UUID_RE.test(trimmed);
  const filter = isUuid
    ? `id=eq.${trimmed.toLowerCase()}`
    : `username=eq.${encodeURIComponent(normalizeUsernameSlug(trimmed))}`;

  if (!isUuid && normalizeUsernameSlug(trimmed).length === 0) return null;

  const url = `${supabaseUrl}/rest/v1/talent?${filter}&select=full_name&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { full_name: string | null }[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const name = rows[0].full_name?.trim();
    return name && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}
