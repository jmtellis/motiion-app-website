import { PROFILE_SLUG_UUID_RE } from "@/lib/profileOg";
import { supabaseRestGet } from "@/lib/supabaseRest";

export type PublicReferrerProfile = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

type TalentLookupRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  headshot_url: string | null;
  headshot_urls: string[] | null;
};

function firstAvatar(row: TalentLookupRow): string | null {
  const fromField = row.headshot_url?.trim();
  if (fromField) return fromField;
  const fromList = row.headshot_urls?.find((item) => item.trim().length > 0)?.trim();
  return fromList || null;
}

export async function resolvePublicReferrer(code: string): Promise<PublicReferrerProfile | null> {
  if (!code) return null;

  const isUuid = PROFILE_SLUG_UUID_RE.test(code);
  const filter = isUuid
    ? `id=eq.${code}`
    : `username=eq.${encodeURIComponent(code)}`;

  const rows = await supabaseRestGet<TalentLookupRow[]>(
    `talent?${filter}&select=id,full_name,username,headshot_url,headshot_urls&limit=1`,
    { revalidate: 300 },
  );

  const row = rows?.[0];
  if (!row) return null;

  const displayName = row.full_name?.trim() || row.username?.trim() || "A Motiion member";
  return {
    userId: row.id,
    displayName,
    username: row.username?.trim() || null,
    avatarUrl: firstAvatar(row),
  };
}
