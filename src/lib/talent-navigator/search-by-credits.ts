import {
  talentMatchesAllEntities,
  talentMatchesAnyEntity,
} from "@/lib/talent-navigator/match-mode";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  TalentNavigatorSearchSchema,
  type TalentNavigatorSearchInput,
  type VerificationStatus,
} from "@/lib/talent-navigator/credit-types";
import { resolveEntityNames } from "@/lib/talent-navigator/entity-resolution";
import type { EntityResolutionResult } from "@/lib/talent-navigator/credit-types";
import {
  pickHighestVerification,
  scoreCreditMatch,
} from "@/lib/talent-navigator/ranking";
import {
  attachEvidenceToTalent,
  creditRowToEvidence,
  type CreditSearchResultTalent,
} from "@/lib/talent-navigator/result-transform";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { searchTalentProfiles } from "@/lib/search/search-profiles";
import type { SearchFilters } from "@/types/search";
import {
  EMPTY_NAVIGATOR_FILTERS,
  type TalentNavigatorFilters,
} from "@/lib/talent-navigator/types";

export type CreditSearchWarning = {
  type: "unresolved" | "ambiguous" | "partial";
  message: string;
  resolution?: EntityResolutionResult;
};

export type CreditSearchResult = {
  talent: CreditSearchResultTalent[];
  total: number;
  warnings: CreditSearchWarning[];
  resolutions: EntityResolutionResult[];
  input: TalentNavigatorSearchInput;
  usingFallbackData: boolean;
  source: "live" | "mock" | "unavailable";
};

type CreditJoinRow = {
  id: string;
  talent_id: string;
  credit_type: string;
  role: string | null;
  production_name_fallback: string | null;
  credit_year: number | null;
  verification_status: string;
  source_type: string;
  artist_entity_id: string | null;
  choreographer_entity_id: string | null;
  production_entity_id: string | null;
  artist: { canonical_name: string } | { canonical_name: string }[] | null;
  choreographer: { canonical_name: string } | { canonical_name: string }[] | null;
  production: { canonical_name: string } | { canonical_name: string }[] | null;
};

function hasCreditCriteria(input: TalentNavigatorSearchInput): boolean {
  return (
    input.resolvedArtistIds.length > 0 ||
    input.resolvedChoreographerIds.length > 0 ||
    input.resolvedProductionIds.length > 0 ||
    input.artists.length > 0 ||
    input.choreographers.length > 0 ||
    input.productions.length > 0
  );
}

function profileFiltersFromCreditInput(input: TalentNavigatorSearchInput): SearchFilters {
  return {
    keyword: input.broadExperienceQuery?.trim() || undefined,
    location: input.location[0],
    style: input.danceStyles[0],
    agency: input.agencies[0],
    representation: input.representedOnly ? "Represented" : undefined,
    navigator: true,
  };
}

function matchingRowsForTalent(
  rows: CreditJoinRow[],
  artistIds: string[],
  choreographerIds: string[],
  productionIds: string[],
): CreditJoinRow[] {
  const hasAnyEntity = artistIds.length + choreographerIds.length + productionIds.length > 0;
  if (!hasAnyEntity) return rows;
  return rows.filter(
    (row) =>
      (row.artist_entity_id && artistIds.includes(row.artist_entity_id)) ||
      (row.choreographer_entity_id && choreographerIds.includes(row.choreographer_entity_id)) ||
      (row.production_entity_id && productionIds.includes(row.production_entity_id)),
  );
}

export async function searchTalentByCredits(
  rawInput: Partial<TalentNavigatorSearchInput>,
  options?: {
    navigatorFilters?: TalentNavigatorFilters;
    preResolved?: EntityResolutionResult[];
  },
): Promise<CreditSearchResult> {
  const input = TalentNavigatorSearchSchema.parse(rawInput);
  const admin = createAdminSupabaseClient();
  const warnings: CreditSearchWarning[] = [];

  let resolutions = options?.preResolved ?? [];
  if (!resolutions.length && hasCreditCriteria(input)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolutions = await resolveEntityNames(admin as any, {
      artists: input.artists,
      choreographers: input.choreographers,
      productions: input.productions,
    });
  }

  const resolvedArtistIds = [
    ...input.resolvedArtistIds,
    ...resolutions
      .filter((r) => r.role === "artist" && r.status === "resolved" && r.entity)
      .map((r) => r.entity!.id),
  ];
  const resolvedChoreographerIds = [
    ...input.resolvedChoreographerIds,
    ...resolutions
      .filter((r) => r.role === "choreographer" && r.status === "resolved" && r.entity)
      .map((r) => r.entity!.id),
  ];
  const resolvedProductionIds = [
    ...input.resolvedProductionIds,
    ...resolutions
      .filter((r) => r.role === "production" && r.status === "resolved" && r.entity)
      .map((r) => r.entity!.id),
  ];

  for (const resolution of resolutions) {
    if (resolution.status === "unresolved") {
      warnings.push({
        type: "unresolved",
        message: `No canonical ${resolution.role} record found for "${resolution.requestedName}".`,
        resolution,
      });
    } else if (resolution.status === "ambiguous") {
      warnings.push({
        type: "ambiguous",
        message: `Multiple matches for "${resolution.requestedName}". Which did you mean?`,
        resolution,
      });
    }
  }

  const ambiguousBlocking = resolutions.some((r) => r.status === "ambiguous");
  const requestedNames =
    input.artists.length + input.choreographers.length + input.productions.length;
  const resolvedCount =
    resolvedArtistIds.length + resolvedChoreographerIds.length + resolvedProductionIds.length;

  if (ambiguousBlocking || (requestedNames > 0 && resolvedCount === 0)) {
    return {
      talent: [],
      total: 0,
      warnings,
      resolutions,
      input: {
        ...input,
        resolvedArtistIds,
        resolvedChoreographerIds,
        resolvedProductionIds,
      },
      usingFallbackData: false,
      source: "live",
    };
  }

  // No credit entities → fall back to standard profile search
  if (resolvedCount === 0) {
    const filters = options?.navigatorFilters;
    const searchFilters = filters
      ? {
          keyword: filters.keyword || input.broadExperienceQuery,
          location: filters.location || input.location[0],
          style: filters.style || input.danceStyles[0],
          navigator: true as const,
        }
      : profileFiltersFromCreditInput(input);
    const result = await searchTalentProfiles(searchFilters);
    const adapted = buildNavigatorInitialData(
      result,
      filters ?? {
        ...EMPTY_NAVIGATOR_FILTERS,
        keyword: searchFilters.keyword ?? "",
        location: searchFilters.location ?? "",
      },
    );
    return {
      talent: adapted.talent.map((t) =>
        attachEvidenceToTalent(t, [], 0),
      ),
      total: adapted.talent.length,
      warnings,
      resolutions,
      input,
      usingFallbackData: adapted.usingFallbackData,
      source: adapted.source,
    };
  }

  if (!admin) {
    return {
      talent: [],
      total: 0,
      warnings: [...warnings, { type: "partial", message: "Credit search is unavailable." }],
      resolutions,
      input,
      usingFallbackData: false,
      source: "unavailable",
    };
  }

  const entityIds = [
    ...new Set([...resolvedArtistIds, ...resolvedChoreographerIds, ...resolvedProductionIds]),
  ];

  let query = admin
    .from("talent_credits")
    .select(
      `
      id,
      talent_id,
      credit_type,
      role,
      production_name_fallback,
      credit_year,
      verification_status,
      source_type,
      artist_entity_id,
      choreographer_entity_id,
      production_entity_id,
      artist:industry_entities!talent_credits_artist_entity_id_fkey(canonical_name),
      choreographer:industry_entities!talent_credits_choreographer_entity_id_fkey(canonical_name),
      production:industry_entities!talent_credits_production_entity_id_fkey(canonical_name)
    `,
    )
    .eq("is_public", true)
    .eq("is_searchable", true)
    .neq("verification_status", "ai_extracted")
    .or(
      [
        resolvedArtistIds.length
          ? `artist_entity_id.in.(${resolvedArtistIds.join(",")})`
          : null,
        resolvedChoreographerIds.length
          ? `choreographer_entity_id.in.(${resolvedChoreographerIds.join(",")})`
          : null,
        resolvedProductionIds.length
          ? `production_entity_id.in.(${resolvedProductionIds.join(",")})`
          : null,
      ]
        .filter(Boolean)
        .join(","),
    )
    .limit(2000);

  if (input.verificationStatuses.length) {
    query = query.in("verification_status", input.verificationStatuses);
  }

  const { data: creditRows, error } = await query;
  if (error) {
    console.error("searchTalentByCredits query failed:", error.message);
    return {
      talent: [],
      total: 0,
      warnings: [...warnings, { type: "partial", message: "Credit search failed. Try again." }],
      resolutions,
      input,
      usingFallbackData: false,
      source: "unavailable",
    };
  }

  const rows = (creditRows as CreditJoinRow[] | null) ?? [];
  const byTalent = new Map<string, CreditJoinRow[]>();
  for (const row of rows) {
    const list = byTalent.get(row.talent_id) ?? [];
    list.push(row);
    byTalent.set(row.talent_id, list);
  }

  const matchingTalentIds: string[] = [];
  const evidenceByTalent = new Map<string, ReturnType<typeof creditRowToEvidence>[]>();
  const scoreByTalent = new Map<string, number>();

  for (const [talentId, talentRows] of byTalent) {
    const matchesMode =
      input.relationshipMatchMode === "any"
        ? talentMatchesAnyEntity(
            talentRows,
            resolvedArtistIds,
            resolvedChoreographerIds,
            resolvedProductionIds,
          )
        : talentMatchesAllEntities(
            talentRows,
            resolvedArtistIds,
            resolvedChoreographerIds,
            resolvedProductionIds,
          );
    if (!matchesMode) continue;

    const matching = matchingRowsForTalent(
      talentRows,
      resolvedArtistIds,
      resolvedChoreographerIds,
      resolvedProductionIds,
    );
    if (matching.length < input.minimumMatchingCredits) continue;

    const evidence = matching.map(creditRowToEvidence);
    const statuses = evidence.map((e) => e.verificationStatus);
    const latestYear = evidence.reduce<number | null>((max, e) => {
      if (e.creditYear == null) return max;
      return max == null ? e.creditYear : Math.max(max, e.creditYear);
    }, null);

    matchingTalentIds.push(talentId);
    evidenceByTalent.set(talentId, evidence);
    scoreByTalent.set(
      talentId,
      scoreCreditMatch({
        matchingCreditCount: evidence.length,
        verificationStatuses: statuses,
        latestCreditYear: latestYear,
      }),
    );
  }

  if (!matchingTalentIds.length) {
    return {
      talent: [],
      total: 0,
      warnings,
      resolutions,
      input: {
        ...input,
        resolvedArtistIds,
        resolvedChoreographerIds,
        resolvedProductionIds,
      },
      usingFallbackData: false,
      source: "live",
    };
  }

  // Load profile data for matching talent via existing search path, then filter
  const baseFilters = options?.navigatorFilters;
  const profileSearch = await searchTalentProfiles({
    ...profileFiltersFromCreditInput(input),
    keyword: baseFilters?.keyword || input.broadExperienceQuery,
    location: baseFilters?.location || input.location[0],
    style: baseFilters?.style || input.danceStyles[0],
    gender: baseFilters?.gender || undefined,
    agency: baseFilters?.agency || input.agencies[0],
    representation: baseFilters?.representation || (input.representedOnly ? "Represented" : undefined),
    navigator: true,
  });

  const adapted = buildNavigatorInitialData(
    profileSearch,
    baseFilters ?? {
      ...EMPTY_NAVIGATOR_FILTERS,
      location: input.location[0] ?? "",
      representation: input.representedOnly ? "Represented" : "",
      agency: input.agencies[0] ?? "",
      style: input.danceStyles[0] ?? "",
      availability: input.availableOnly ? "Available" : "",
      artists: input.artists,
      choreographers: input.choreographers,
      productions: input.productions,
      relationshipMatchMode: input.relationshipMatchMode,
      verificationStatuses: input.verificationStatuses,
    },
  );

  const idSet = new Set(matchingTalentIds);
  let matched = adapted.talent.filter((t) => idSet.has(t.id));

  // If profile search missed some credit matches (keyword narrowing), fetch those profiles directly
  const missingIds = matchingTalentIds.filter((id) => !matched.some((t) => t.id === id));
  if (missingIds.length && admin) {
    const { data: profiles } = await admin
      .from("talent")
      .select(
        "id, full_name, username, headshot_url, location, representation, styles, gender, ethnicity, height, union_status",
      )
      .in("id", missingIds.slice(0, 50));

    for (const row of profiles ?? []) {
      matched.push({
        id: row.id as string,
        slug: (row.username as string) || (row.id as string),
        name: (row.full_name as string) || "Talent",
        location: (row.location as string) || undefined,
        agency: (row.representation as string) || undefined,
        styles: (row.styles as string[]) || [],
        height: (row.height as string) || undefined,
        unionStatus: (row.union_status as string) || undefined,
        gender: (row.gender as string) || undefined,
        ethnicity: Array.isArray(row.ethnicity) ? row.ethnicity[0] : (row.ethnicity as string) || undefined,
        imageUrl: (row.headshot_url as string) || "/images/placeholder-talent.jpg",
        represented: Boolean(row.representation),
      });
    }
  }

  const withEvidence = matched
    .map((talent) => {
      const evidence = evidenceByTalent.get(talent.id) ?? [];
      const score = scoreByTalent.get(talent.id) ?? 0;
      return attachEvidenceToTalent(talent, evidence, score);
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  const sliced = withEvidence.slice(input.offset, input.offset + input.limit);

  void entityIds;

  return {
    talent: sliced,
    total: withEvidence.length,
    warnings,
    resolutions,
    input: {
      ...input,
      resolvedArtistIds,
      resolvedChoreographerIds,
      resolvedProductionIds,
    },
    usingFallbackData: adapted.usingFallbackData,
    source: adapted.source,
  };
}

export function countVerifiedEvidence(talent: CreditSearchResultTalent[]): number {
  return talent.filter((t) =>
    t.matchingCredits.some((c) => {
      const status = c.verificationStatus as VerificationStatus | undefined;
      return status === "motiion_verified" || status === "industry_confirmed";
    }),
  ).length;
}

export function summarizeHighestVerification(
  talent: CreditSearchResultTalent[],
): VerificationStatus | null {
  const statuses = talent
    .flatMap((t) => t.matchingCredits.map((c) => c.verificationStatus as VerificationStatus))
    .filter(Boolean);
  if (!statuses.length) return null;
  return pickHighestVerification(statuses);
}
