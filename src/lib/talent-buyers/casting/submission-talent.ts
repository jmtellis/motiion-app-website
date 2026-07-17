import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export type TalentProfileBundle = {
  userId: string;
  fullName: string;
  email: string | null;
  agency: string | null;
  headshotUrl: string | null;
  resumeUrl: string | null;
  professionalProfileId: string | null;
  slug: string | null;
};

const GENERIC_APPLICANT_NAMES = new Set([
  "candidate",
  "unnamed applicant",
  "applicant",
  "talent",
]);

export function isGenericApplicantName(name: string | null | undefined): boolean {
  if (!name?.trim()) return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (GENERIC_APPLICANT_NAMES.has(lower)) return true;
  // Slug-style placeholders from referral writes (e.g. "piinklemonade", "user_00000009").
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/.test(lower)) return true;
  if (/^[a-z0-9]{6,}$/.test(lower) && !/\s/.test(trimmed)) return true;
  if (/^user_\d+$/i.test(trimmed)) return true;
  return false;
}

export function formatProfileDisplayName(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const display = profile.display_name?.trim();
  if (display) return display;

  const parts = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (parts) return parts;

  const username = profile.username?.trim();
  if (username) return username.replace(/-/g, " ");

  return "Talent";
}

function firstHeadshotUrl(headshotUrls: unknown): string | null {
  if (!Array.isArray(headshotUrls)) return null;
  const url = headshotUrls.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof url === "string" ? url : null;
}

function headshotFromMediaAssets(assets: unknown): string | null {
  if (!Array.isArray(assets)) return null;
  const headshot = assets.find(
    (asset) =>
      asset &&
      typeof asset === "object" &&
      (asset as { kind?: string }).kind === "headshot" &&
      typeof (asset as { url?: string }).url === "string",
  ) as { url?: string } | undefined;
  return headshot?.url?.trim() || null;
}

export async function fetchTalentProfileBundles(
  supabase: SupabaseClient,
  talentIds: string[],
): Promise<Map<string, TalentProfileBundle>> {
  const uniqueIds = [...new Set(talentIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const client = createAdminSupabaseClient() ?? supabase;

  const [{ data: profiles }, { data: professionalProfiles }] = await Promise.all([
    client
      .from("profiles")
      .select("user_id, display_name, first_name, last_name, username, email, representation, agent, headshot_urls, resume_url")
      .in("user_id", uniqueIds),
    client
      .from("professional_profiles")
      .select("id, user_id, slug, media_assets(url, kind, position)")
      .in("user_id", uniqueIds),
  ]);

  const proByUserId = new Map(
    (professionalProfiles ?? []).map((row) => [row.user_id as string, row]),
  );

  const bundles = new Map<string, TalentProfileBundle>();

  for (const row of profiles ?? []) {
    const userId = row.user_id as string;
    const pro = proByUserId.get(userId);
    const agency =
      (row.representation as string | null)?.trim() ||
      (row.agent as string | null)?.trim() ||
      null;

    bundles.set(userId, {
      userId,
      fullName: formatProfileDisplayName(row),
      email: (row.email as string | null) ?? null,
      agency,
      headshotUrl:
        firstHeadshotUrl(row.headshot_urls) ?? headshotFromMediaAssets(pro?.media_assets) ?? null,
      resumeUrl: (row.resume_url as string | null)?.trim() || null,
      professionalProfileId: (pro?.id as string | null) ?? null,
      slug: (pro?.slug as string | null) ?? null,
    });
  }

  return bundles;
}

export function applyTalentBundleToApplicantFields<
  T extends {
    fullName: string;
    email?: string | null;
    agency?: string | null;
    headshotUrl?: string | null;
    talentId?: string | null;
    talentProfileId?: string | null;
    talentSlug?: string | null;
  },
>(row: T, bundle: TalentProfileBundle | undefined): T {
  if (!bundle) return row;

  return {
    ...row,
    fullName: isGenericApplicantName(row.fullName) ? bundle.fullName : row.fullName,
    email: row.email ?? bundle.email ?? undefined,
    agency: row.agency ?? bundle.agency ?? undefined,
    headshotUrl: row.headshotUrl ?? bundle.headshotUrl ?? undefined,
    talentProfileId: row.talentProfileId ?? bundle.professionalProfileId ?? undefined,
    talentSlug: row.talentSlug ?? bundle.slug ?? undefined,
  };
}
