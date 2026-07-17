import { GENRE_OPTIONS } from "@/lib/talent-navigator/filter-options";
import { EMPTY_NAVIGATOR_FILTERS, type TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import type { CastingRole } from "./casting-types";

const GENRE_LOOKUP = new Set(GENRE_OPTIONS.map((genre) => genre.toLowerCase()));

export type CastingRoleMatchAttributes = {
  gender?: string;
  danceStyles: string[];
  locationRequirements: string[];
  ethnicityPreferences: string[];
  unionRequirement?: string;
  projectLocation?: string;
};

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function dedupeStrings(values: string[]): string[] {
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

function isDanceGenreTag(tag: string): boolean {
  return GENRE_LOOKUP.has(tag.trim().toLowerCase());
}

export function resolveCastingRoleMatchAttributes(input: {
  gender?: string | null;
  ethnicity_preferences?: string[] | null;
  union_status?: string | null;
  match_filters?: Record<string, unknown> | null;
  client_match_filters?: Record<string, unknown> | null;
}): CastingRoleMatchAttributes {
  const matchFilters = input.match_filters ?? {};
  const clientMatchFilters = input.client_match_filters ?? {};

  const genderRaw =
    input.gender ??
    (typeof matchFilters.gender === "string" ? matchFilters.gender : null) ??
    (typeof clientMatchFilters.gender === "string" ? clientMatchFilters.gender : null);
  const gender =
    genderRaw?.trim() && genderRaw.trim().toLowerCase() !== "any" ? genderRaw.trim() : undefined;

  const styleCandidates = dedupeStrings([
    ...parseStringArray(matchFilters.danceStyles),
    ...parseStringArray(matchFilters.genres),
    ...parseStringArray(clientMatchFilters.genres),
    ...parseStringArray(matchFilters.skills),
    ...parseStringArray(clientMatchFilters.skills),
  ]);
  const danceStyles = styleCandidates.filter(isDanceGenreTag);

  const locationRequirements = dedupeStrings([
    ...parseStringArray(matchFilters.locationRequirements),
    ...parseStringArray(clientMatchFilters.locationRequirements),
  ]);

  const projectLocationRaw =
    (typeof matchFilters.location === "string" ? matchFilters.location : "") ||
    (typeof clientMatchFilters.location === "string" ? clientMatchFilters.location : "");
  const projectLocation = projectLocationRaw.trim() || undefined;

  const ethnicityPreferences = dedupeStrings([
    ...(input.ethnicity_preferences ?? []),
    ...parseStringArray(matchFilters.ethnicities),
    ...parseStringArray(clientMatchFilters.ethnicities),
    ...(typeof matchFilters.ethnicity === "string" ? [matchFilters.ethnicity] : []),
    ...(typeof clientMatchFilters.ethnicity === "string" ? [clientMatchFilters.ethnicity] : []),
  ]);

  const unionRequirement =
    input.union_status?.trim() ||
    (typeof matchFilters.unionRequirement === "string" ? matchFilters.unionRequirement.trim() : "") ||
    (typeof clientMatchFilters.unionStatus === "string" ? clientMatchFilters.unionStatus.trim() : "") ||
    undefined;

  return {
    gender,
    danceStyles,
    locationRequirements,
    ethnicityPreferences,
    unionRequirement: unionRequirement || undefined,
    projectLocation,
  };
}

export function castingConfigurationLocalHireOnly(
  configuration?: Record<string, unknown> | null,
): boolean {
  return configuration?.local_hire_only === true;
}

export function mapCastingRoleToMatchFilters(
  role: CastingRole,
  options?: {
    keyword?: string;
    localHireOnly?: boolean;
  },
): TalentNavigatorFilters {
  const gender = role.gender ?? role.genderPresentation?.[0];
  const danceStyles = (role.danceStyles ?? []).filter(isDanceGenreTag);
  const ethnicity = role.ethnicityPreferences?.[0]?.trim();

  let location = "";
  if (options?.localHireOnly) {
    location = role.locationRequirements?.[0] ?? "";
  }

  return {
    ...EMPTY_NAVIGATOR_FILTERS,
    openRoleId: role.bridgedRoleId ?? role.id,
    keyword: options?.keyword?.trim() ?? "",
    style: danceStyles[0] ?? "",
    gender: gender && gender.toLowerCase() !== "any" ? gender : "",
    location,
    unionStatus: role.unionRequirement?.trim() ?? "",
    ethnicity: ethnicity ?? "",
  };
}
