import type { Talent } from "@/lib/talent-navigator/types";
import type { MatchReason, SearchIntent } from "@/lib/talent-navigator/search-intent";
import {
  buildOppositeMatchReason,
  type OppositeHeightWindow,
} from "@/lib/talent-navigator/opposite-match";
import { heightStringToInches } from "@/lib/talent-navigator/opposite-match";
import { profileMatchesHeightFilter } from "@/lib/talent-navigator/height-filter";

/**
 * Build evidence-backed match reasons. Never invent facts the profile lacks.
 */
export function buildMatchReasonsForTalent(input: {
  talent: Talent;
  intent: SearchIntent;
  oppositeWindow?: OppositeHeightWindow | null;
  referenceName?: string;
}): MatchReason[] {
  const reasons: MatchReason[] = [];
  const { talent, intent } = input;

  // Credit evidence
  for (const credit of talent.matchingCredits?.slice(0, 3) ?? []) {
    const parts = [
      credit.artistName ? `Worked with ${credit.artistName}` : null,
      credit.choreographerName ? `Credit with choreographer ${credit.choreographerName}` : null,
      credit.productionName ? `Appeared in ${credit.productionName}` : null,
    ].filter(Boolean);
    reasons.push({
      category: "credit",
      label: parts[0] ?? credit.role ?? "Matching credit",
      evidenceType: "credit",
      evidenceId: credit.id,
      verificationStatus: credit.verificationStatus,
      sourceType: credit.sourceLabel,
      caveat:
        credit.verificationStatus === "talent_reported" ||
        credit.verificationLabel?.toLowerCase().includes("self")
          ? "Credit is self-reported and not yet verified."
          : undefined,
    });
  }

  // Hard style / genre filters
  const styleFilters = intent.hardFilters.filter((f) => f.field === "danceStyle");
  for (const filter of styleFilters) {
    const wanted = String(filter.value).toLowerCase();
    const hit = talent.styles.some((s) => s.toLowerCase().includes(wanted) || wanted.includes(s.toLowerCase()));
    if (hit) {
      reasons.push({
        category: "movement",
        label: `${filter.label ?? filter.value} is listed on their profile`,
        evidenceType: "self_selected_tag",
      });
    }
  }

  // Skills from navigator genres that appear on profile
  for (const concept of intent.semanticConcepts) {
    if (concept.category === "visual_direction") {
      // Phase 1: no dedicated visual descriptor fields yet — disclose limitation
      reasons.push({
        category: "visual",
        label: `Visual direction “${concept.label}” is an interpreted search preference`,
        evidenceType: "self_selected_tag",
        caveat: "Visual-direction match is based on search interpretation; dancer-selected descriptors are limited until profile enrichment.",
      });
      break;
    }
  }

  // Location
  const locationFilter = intent.hardFilters.find((f) => f.field === "location");
  if (locationFilter && talent.location) {
    const wanted = String(locationFilter.value).toLowerCase();
    if (talent.location.toLowerCase().includes(wanted)) {
      reasons.push({
        category: "logistics",
        label: `Based in ${talent.location}`,
        evidenceType: "profile_field",
      });
    }
  }

  // Union
  const unionFilter = intent.hardFilters.find((f) => f.field === "unionStatus");
  if (unionFilter && talent.unionStatus) {
    reasons.push({
      category: "requirement",
      label: `Union status: ${talent.unionStatus}`,
      evidenceType: "profile_field",
    });
  }

  // Height / opposite
  const heightFilter = intent.hardFilters.find((f) => f.field === "height");
  if (input.oppositeWindow && input.referenceName) {
    const oppositeReason = buildOppositeMatchReason({
      candidateHeight: talent.height,
      referenceName: input.referenceName,
      window: input.oppositeWindow,
    });
    if (oppositeReason) reasons.unshift(oppositeReason);
  } else if (heightFilter && talent.height) {
    const raw = String(heightFilter.value);
    if (profileMatchesHeightFilter(talent.height, raw)) {
      reasons.push({
        category: "requirement",
        label: `Height ${talent.height} matches the requested range`,
        evidenceType: "profile_field",
      });
    }
  }

  // Gender (only when explicitly filtered — never inferred)
  const genderFilter = intent.hardFilters.find((f) => f.field === "gender");
  if (genderFilter && talent.gender) {
    reasons.push({
      category: "requirement",
      label: `Gender presentation matches requested filter`,
      evidenceType: "profile_field",
    });
  }

  // De-dupe by label
  const seen = new Set<string>();
  return reasons.filter((r) => {
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  }).slice(0, 5);
}

export function attachMatchReasons(
  talent: Talent[],
  intent: SearchIntent,
  options?: {
    oppositeWindow?: OppositeHeightWindow | null;
    referenceName?: string;
    excludeProfileId?: string;
  },
): Talent[] {
  return talent
    .filter((t) => (options?.excludeProfileId ? t.id !== options.excludeProfileId : true))
    .map((t) => ({
      ...t,
      matchReasons: buildMatchReasonsForTalent({
        talent: t,
        intent,
        oppositeWindow: options?.oppositeWindow,
        referenceName: options?.referenceName,
      }),
    }));
}

export function rankOppositeCandidates(
  talent: Talent[],
  oppositeWindow: OppositeHeightWindow | null,
  referenceStyles: string[],
): Talent[] {
  if (!oppositeWindow) return talent;

  return [...talent].sort((a, b) => {
    const aInches = heightStringToInches(a.height);
    const bInches = heightStringToInches(b.height);
    const aDelta =
      aInches == null ? 99 : Math.abs(aInches - oppositeWindow.referenceInches);
    const bDelta =
      bInches == null ? 99 : Math.abs(bInches - oppositeWindow.referenceInches);
    if (aDelta !== bDelta) return aDelta - bDelta;

    const aOverlap = styleOverlap(a.styles, referenceStyles);
    const bOverlap = styleOverlap(b.styles, referenceStyles);
    return bOverlap - aOverlap;
  });
}

function styleOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => setB.has(s.toLowerCase())).length;
}
