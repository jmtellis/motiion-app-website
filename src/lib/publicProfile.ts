import { PROFILE_SLUG_UUID_RE, normalizeUsernameSlug } from "@/lib/profileOg";
import { supabaseRestGet } from "@/lib/supabaseRest";
import type { PublicTalentProfile } from "@/types/public";

const TALENT_SELECT = [
  "id",
  "full_name",
  "username",
  "headshot_url",
  "headshot_urls",
  "location",
  "representation",
  "agency_logo_url",
  "gender",
  "height",
  "union_status",
  "skills",
  "styles",
  "talent_types",
  "profile_highlights",
  "experiences",
  "training",
  "profile_visuals",
  "resume_url",
  "instagram_url",
  "youtube_url",
].join(",");

type TalentRow = PublicTalentProfile;

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeTalentRow(row: TalentRow): PublicTalentProfile {
  return {
    ...row,
    full_name: row.full_name?.trim() || null,
    username: row.username?.trim() || null,
    headshot_url: row.headshot_url?.trim() || row.headshot_urls?.[0]?.trim() || null,
    headshot_urls: row.headshot_urls ?? null,
    location: row.location?.trim() || null,
    representation: row.representation?.trim() || null,
    skills: parseStringArray(row.skills),
    styles: parseStringArray(row.styles),
    talent_types: parseStringArray(row.talent_types),
    profile_highlights: Array.isArray(row.profile_highlights) ? row.profile_highlights : [],
    experiences: Array.isArray(row.experiences) ? row.experiences : [],
    training: Array.isArray(row.training) ? row.training : [],
    profile_visuals: Array.isArray(row.profile_visuals) ? row.profile_visuals : [],
  };
}

export async function fetchPublicTalentProfile(slug: string): Promise<PublicTalentProfile | null> {
  const trimmed = decodeURIComponent(slug).trim();
  const isUuid = PROFILE_SLUG_UUID_RE.test(trimmed);
  const username = normalizeUsernameSlug(trimmed);

  if (!isUuid && username.length === 0) return null;

  const filter = isUuid
    ? `id=eq.${trimmed.toLowerCase()}`
    : `username=eq.${encodeURIComponent(username)}`;

  const rows = await supabaseRestGet<TalentRow[]>(
    `talent?${filter}&select=${TALENT_SELECT}&limit=1`,
    { revalidate: 300 },
  );

  if (!rows?.length) return null;
  return normalizeTalentRow(rows[0]);
}
