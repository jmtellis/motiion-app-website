import { jsonbToStringArray, textToStringArray } from "@/lib/professional-profile/jsonb-fields";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  styles: unknown;
  skills: unknown;
  gender: string | null;
  ethnicity: string | null;
  height: string | null;
  union_status: string | null;
  working_locations: unknown;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
};

function parseHeightCm(height: string | null): number | null {
  if (!height) return null;
  const match = height.match(/(\d+)['"]?\s*(\d+)?/);
  if (!match) return null;
  const feet = Number(match[1]);
  const inches = Number(match[2] ?? 0);
  if (!Number.isFinite(feet)) return null;
  return Math.round((feet * 12 + inches) * 2.54);
}

function slugFromUsername(username: string | null, userId: string): string {
  const base = username?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || `talent-${userId.slice(0, 8)}`;
  return base.replace(/-+/g, "-").replace(/^-|-$/g, "") || `talent-${userId.slice(0, 8)}`;
}

function primaryLocation(workingLocations: unknown): { city: string | null; region: string | null } {
  if (!Array.isArray(workingLocations) || !workingLocations.length) {
    return { city: null, region: null };
  }
  const first = workingLocations[0];
  if (typeof first === "string") return { city: first, region: null };
  if (first && typeof first === "object") {
    const row = first as Record<string, unknown>;
    return {
      city: typeof row.city === "string" ? row.city : typeof row.label === "string" ? row.label : null,
      region: typeof row.region === "string" ? row.region : typeof row.state === "string" ? row.state : null,
    };
  }
  return { city: null, region: null };
}

/** Sync legacy profiles row into professional_profiles for search + matching. */
export async function syncProfessionalProfile(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, first_name, last_name, styles, skills, gender, ethnicity, height, union_status, working_locations, instagram_url, tiktok_url, youtube_url",
    )
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (readError) return { ok: false, error: readError.message };
  if (!profile) return { ok: false, error: "Profile not found" };

  const { city, region } = primaryLocation(profile.working_locations);
  const slug = slugFromUsername(profile.username, userId);

  const { error: upsertError } = await supabase.from("professional_profiles").upsert(
    {
      user_id: userId,
      slug,
      subtype: "dancer",
      bio: null,
      location_city: city,
      location_region: region,
      gender: profile.gender,
      ethnicity: textToStringArray(profile.ethnicity),
      height_cm: parseHeightCm(profile.height),
      styles: jsonbToStringArray(profile.styles),
      skills: jsonbToStringArray(profile.skills),
      union_status: profile.union_status,
      availability: "available",
      social_links: {
        instagram: profile.instagram_url,
        tiktok: profile.tiktok_url,
        youtube: profile.youtube_url,
      },
    },
    { onConflict: "user_id" },
  );

  if (upsertError) return { ok: false, error: upsertError.message };
  return { ok: true };
}
