import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensurePendingEntity } from "@/lib/talent-navigator/credit-management";
import { ExtractedCreditSchema, type ExtractedCredit } from "@/lib/talent-navigator/credit-types";
import type { ExtractedResumeData } from "@/lib/onboarding/resume-types";

function yearFromDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

function creditTypeFromCategory(category: string | null | undefined): string {
  switch (category) {
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

/**
 * Map resume extraction experiences into structured credit proposals.
 * Does not invent missing people/productions.
 */
export function extractedResumeToCreditProposals(
  extracted: ExtractedResumeData,
): ExtractedCredit[] {
  const proposals: ExtractedCredit[] = [];
  for (const exp of extracted.experiences ?? []) {
    const artistName = exp.artist?.trim() || undefined;
    const choreographerName = exp.choreographer?.trim() || undefined;
    const productionName =
      exp.projectTitle?.trim() ||
      exp.title?.trim() ||
      exp.songTitle?.trim() ||
      exp.company?.trim() ||
      undefined;

    if (!artistName && !choreographerName && !productionName) continue;

    const sourceParts = [
      exp.title,
      exp.projectTitle,
      exp.artist,
      exp.choreographer,
      exp.role,
      exp.notes,
    ].filter(Boolean);

    const candidate = {
      creditType: creditTypeFromCategory(exp.category),
      artistName,
      choreographerName,
      productionName,
      role: exp.role?.trim() || undefined,
      year: yearFromDate(exp.startDate) ?? yearFromDate(exp.endDate),
      sourceText: sourceParts.join(" · ").slice(0, 500),
      confidence: artistName || choreographerName ? 0.7 : 0.5,
    };

    const parsed = ExtractedCreditSchema.safeParse(candidate);
    if (parsed.success) proposals.push(parsed.data);
  }
  return proposals;
}

/**
 * Persist AI-extracted credit proposals as non-searchable ai_extracted rows
 * for talent review. Never auto-publishes.
 */
export async function persistAiExtractedCredits(
  talentId: string,
  proposals: ExtractedCredit[],
): Promise<{ inserted: number; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { inserted: 0, error: "Supabase is not configured." };

  let inserted = 0;
  for (const proposal of proposals) {
    const artistEntityId = proposal.artistName
      ? await ensurePendingEntity(supabase, proposal.artistName, "artist")
      : null;
    const choreographerEntityId = proposal.choreographerName
      ? await ensurePendingEntity(supabase, proposal.choreographerName, "choreographer")
      : null;
    const productionEntityId = proposal.productionName
      ? await ensurePendingEntity(supabase, proposal.productionName, "production")
      : null;

    const { error } = await supabase.from("talent_credits").insert({
      talent_id: talentId,
      credit_type: proposal.creditType,
      artist_entity_id: artistEntityId,
      choreographer_entity_id: choreographerEntityId,
      production_entity_id: productionEntityId,
      role: proposal.role ?? null,
      production_name_fallback: proposal.productionName ?? null,
      credit_year: proposal.year ?? null,
      verification_status: "ai_extracted",
      verification_confidence: proposal.confidence,
      source_type: "resume",
      source_text: proposal.sourceText,
      is_public: false,
      is_searchable: false,
      created_by: talentId,
    });

    if (!error) inserted += 1;
  }

  return { inserted };
}
