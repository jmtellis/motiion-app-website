import type { CastingRole, CastingRoleStatus } from "./casting-types";
import { resolveCastingRoleMatchAttributes } from "./casting-role-match-attributes";

export function mapRoleRow(
  row: Record<string, unknown>,
  castingId: string,
  bridgedRole?: {
    id: string;
    gender?: string | null;
    height_min?: string | null;
    height_max?: string | null;
    agency_required?: boolean | null;
    slate_required?: boolean | null;
    max_submission_links?: number | null;
    submission_limit?: number | null;
    talent_pays_travel?: boolean | null;
    visibility?: CastingRole["visibility"] | null;
    card_color_preset?: CastingRole["cardColorPreset"] | null;
    cover_image_url?: string | null;
    special_skills?: string[] | null;
    ethnicity_preferences?: string[] | null;
    client_match_filters?: Record<string, unknown> | null;
    is_casting_finalized?: boolean | null;
    final_select_ids?: string[] | null;
    is_active?: boolean | null;
  },
  bridgedRoleIds: string[] = [],
): CastingRole {
  const matchFilters = (row.match_filters as Record<string, unknown> | null) ?? {};
  const clientMatchFilters = bridgedRole?.client_match_filters ?? {};
  const attrs = resolveCastingRoleMatchAttributes({
    gender: row.gender as string | null,
    ethnicity_preferences:
      (row.ethnicity_preferences as string[] | null) ?? bridgedRole?.ethnicity_preferences ?? null,
    union_status: row.union_status as string | null,
    match_filters: matchFilters,
    client_match_filters: clientMatchFilters,
  });

  const locationFromFilters = dedupeLocationRequirements([
    ...attrs.locationRequirements,
    ...(attrs.projectLocation ? [attrs.projectLocation] : []),
  ]);

  const resolvedBridgedIds = [
    ...new Set(
      [bridgedRole?.id, ...bridgedRoleIds].filter((id): id is string => Boolean(id)),
    ),
  ];

  return {
    id: row.id as string,
    castingProjectId: castingId,
    bridgedRoleId: resolvedBridgedIds[0],
    bridgedRoleIds: resolvedBridgedIds,
    name: (row.title as string) || "Role",
    description: (row.description as string | null) ?? undefined,
    quantityNeeded: (row.people_needed as number | null) ?? 1,
    status: ((row.status as CastingRoleStatus | null) ?? "draft") as CastingRoleStatus,
    isCastingFinalized: Boolean(bridgedRole?.is_casting_finalized),
    isActive: bridgedRole?.is_active ?? undefined,
    priority: (row.priority as CastingRole["priority"]) ?? undefined,
    danceStyles: attrs.danceStyles.length ? attrs.danceStyles : undefined,
    gender: attrs.gender,
    genderPresentation: attrs.gender ? [attrs.gender] : undefined,
    specialSkills:
      (row.special_skills as string[] | null) ??
      bridgedRole?.special_skills ??
      (Array.isArray(matchFilters.skills) ? (matchFilters.skills as string[]) : undefined),
    ethnicityPreferences: attrs.ethnicityPreferences.length ? attrs.ethnicityPreferences : undefined,
    ageRange: {
      min: (row.age_min as number | null) ?? undefined,
      max: (row.age_max as number | null) ?? undefined,
    },
    heightRange: {
      min: (row.height_min_cm as number | null) ?? undefined,
      max: (row.height_max_cm as number | null) ?? undefined,
      unit: "cm",
    },
    heightMinDisplay: bridgedRole?.height_min ?? undefined,
    heightMaxDisplay: bridgedRole?.height_max ?? undefined,
    agencyRequired: bridgedRole?.agency_required ?? false,
    slateRequired: bridgedRole?.slate_required ?? false,
    maxSubmissionLinks: bridgedRole?.max_submission_links ?? 0,
    submissionLimit: bridgedRole?.submission_limit ?? 0,
    talentPaysTravel: bridgedRole?.talent_pays_travel ?? false,
    visibility: bridgedRole?.visibility ?? "public",
    cardColorPreset: bridgedRole?.card_color_preset ?? "midnight",
    coverImageUrl: bridgedRole?.cover_image_url ?? undefined,
    clientMatchFilters: Object.keys(clientMatchFilters).length ? clientMatchFilters : matchFilters,
    locationRequirements: locationFromFilters.length ? locationFromFilters : undefined,
    unionRequirement: attrs.unionRequirement,
    internalNotes: (row.internal_notes as string | null) ?? undefined,
    order: (row.sort_order as number | null) ?? 0,
  };
}

function dedupeLocationRequirements(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** iOS stores project roles directly, without requiring a child casting. */
export function mapProjectRoleRow(row: Record<string, unknown>, projectId: string): CastingRole {
  return mapRoleRow({
    ...row,
    age_min: row.age_range_min,
    age_max: row.age_range_max,
    status: row.is_active === false ? "closed" : "open",
  }, projectId, row as Parameters<typeof mapRoleRow>[2]);
}
