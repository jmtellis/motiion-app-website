/**
 * Backfill industry_entities + talent_credits from profiles.experiences JSONB.
 *
 * Usage (with service role env):
 *   npx tsx scripts/backfill-talent-credits.ts
 */
import { createClient } from "@supabase/supabase-js";

import { normalizeIndustryEntityName } from "../src/lib/talent-navigator/normalize-entity-name";
import { parseResumeExperienceCategory } from "../src/lib/profile/resume-experience";

type Experience = {
  title?: string | null;
  role?: string | null;
  credits?: string | null;
  credits_display_name?: string | null;
  category?: string | null;
  song_artists?: string[] | null;
  choreographers?: string[] | null;
  choreographer?: string | null;
  production_company?: string | null;
  main_talent?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

function yearFromDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

function creditTypeFromCategory(category: string | null | undefined): string {
  const parsed = parseResumeExperienceCategory(category);
  switch (parsed) {
    case "musicVideos":
      return "music_video";
    case "liveStage":
      return "live_performance";
    case "printCommercial":
      return "commercial";
    case "televisionFilm":
      return "film";
    default:
      return "other";
  }
}

async function ensureEntity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  name: string,
  entityType: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = normalizeIndustryEntityName(trimmed);
  const { data: existing } = await client
    .from("industry_entities")
    .select("id")
    .eq("entity_type", entityType)
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await client
    .from("industry_entities")
    .insert({
      entity_type: entityType,
      canonical_name: trimmed,
      normalized_name: normalized,
      is_pending: false,
      is_verified: false,
      metadata: { backfill: true },
    })
    .select("id")
    .single();
  if (error) {
    // Unique race: re-select
    const { data: again } = await client
      .from("industry_entities")
      .select("id")
      .eq("entity_type", entityType)
      .eq("normalized_name", normalized)
      .maybeSingle();
    return (again?.id as string) ?? null;
  }
  return data.id as string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error } = await client
    .from("profiles")
    .select("user_id, experiences")
    .eq("account_type", "talent")
    .not("experiences", "is", null)
    .limit(5000);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let createdCredits = 0;
  let skipped = 0;

  for (const profile of profiles ?? []) {
    const talentId = profile.user_id as string;
    const experiences = (profile.experiences as Experience[] | null) ?? [];
    for (const exp of experiences) {
      const artists = [
        ...(exp.song_artists ?? []),
        exp.credits_display_name || exp.credits || "",
        exp.main_talent || "",
      ].filter(Boolean);
      const choreographers = [
        ...(exp.choreographers ?? []),
        exp.choreographer || "",
      ].filter(Boolean);
      const productionName = exp.title || exp.production_company || "";

      const artistId = artists[0]
        ? await ensureEntity(client, artists[0], "artist")
        : null;
      const choreoId = choreographers[0]
        ? await ensureEntity(client, choreographers[0], "choreographer")
        : null;
      const productionId = productionName
        ? await ensureEntity(
            client,
            productionName,
            creditTypeFromCategory(exp.category) === "music_video" ? "music_video" : "production",
          )
        : null;

      if (!artistId && !choreoId && !productionId) {
        skipped += 1;
        continue;
      }

      const { error: insertError } = await client.from("talent_credits").insert({
        talent_id: talentId,
        credit_type: creditTypeFromCategory(exp.category),
        artist_entity_id: artistId,
        choreographer_entity_id: choreoId,
        production_entity_id: productionId,
        role: exp.role ?? null,
        production_name_fallback: exp.title ?? null,
        credit_year: yearFromDate(exp.start_date) ?? yearFromDate(exp.end_date),
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        verification_status: "talent_reported",
        source_type: "admin_import",
        source_reference: "profiles.experiences backfill",
        is_public: true,
        is_searchable: true,
        created_by: talentId,
      });

      if (insertError) {
        console.warn("skip credit:", insertError.message);
        skipped += 1;
      } else {
        createdCredits += 1;
      }
    }
  }

  console.log(`Backfill complete. Created ${createdCredits} credits, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
