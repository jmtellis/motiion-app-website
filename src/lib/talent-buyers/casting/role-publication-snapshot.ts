import { heightToTotalInches } from "@/lib/search/talent-filter-logic";
import type { ParsedCastingComposerForm } from "@/lib/talent-buyers/casting-schema";
import type { CastingConfiguration, CastingRoleForm } from "@/types/casting";

/** Mirrors iOS `TalentSearchFilters` JSON persisted on `roles.client_match_filters`. */
export type RoleClientMatchFilters = {
  ageMin?: number | null;
  ageMax?: number | null;
  gender?: string | null;
  ethnicity?: string | null;
  ethnicities?: string[] | null;
  height?: string | null;
  heightMin?: string | null;
  heightMax?: string | null;
  hairColors?: string[] | null;
  eyeColors?: string[] | null;
  genres?: string[] | null;
  talentTypes?: string[] | null;
  agency?: string | null;
  agencies?: string[] | null;
  unionStatus?: string | null;
  skills?: string[] | null;
  location?: string | null;
  hasRepresentation?: boolean | null;
};

function parseOptionalInt(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function orderedDedupedStyleTags(...groups: (string[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of groups) {
    for (const tag of group ?? []) {
      const trimmed = tag.trim();
      if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }
  return result;
}

function normalizeHeightLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function composerRolePublicationFallback(
  role: CastingRoleForm,
  locationCityText: string,
  isUnionContract: boolean,
): RoleClientMatchFilters {
  const filters: RoleClientMatchFilters = {};
  const styleTags = orderedDedupedStyleTags(role.specialSkills).slice(0, 6);

  if (styleTags.length) {
    filters.genres = styleTags;
    filters.skills = styleTags;
  }

  const city = locationCityText.trim();
  if (city) filters.location = city;

  const gender = role.gender?.trim();
  if (gender && gender.toLowerCase() !== "any") {
    filters.gender = gender;
  }

  const ageMin = parseOptionalInt(role.ageRangeMin);
  const ageMax = parseOptionalInt(role.ageRangeMax);
  if (ageMin != null) filters.ageMin = ageMin;
  if (ageMax != null) filters.ageMax = ageMax;

  const heightMin = normalizeHeightLabel(role.heightMin);
  const heightMax = normalizeHeightLabel(role.heightMax);
  if (heightMin) filters.heightMin = heightMin;
  if (heightMax) filters.heightMax = heightMax;

  if (role.agencyRequired) filters.hasRepresentation = true;

  if (role.unionStatus?.trim() && isUnionContract) {
    filters.unionStatus = role.unionStatus.trim();
  } else if (role.unionStatus?.trim()) {
    filters.unionStatus = role.unionStatus.trim();
  }

  if (role.ethnicityPreferences.length) {
    filters.ethnicities = role.ethnicityPreferences;
  }

  return filters;
}

function mergeFilters(
  overlay: RoleClientMatchFilters | null | undefined,
  fallback: RoleClientMatchFilters,
): RoleClientMatchFilters {
  if (!overlay || Object.keys(overlay).length === 0) return fallback;

  const merged: RoleClientMatchFilters = { ...fallback, ...overlay };
  const styleTags = orderedDedupedStyleTags(
    overlay.genres,
    overlay.skills,
    fallback.genres,
    fallback.skills,
  ).slice(0, 6);

  if (styleTags.length) {
    merged.genres = styleTags;
    merged.skills = styleTags;
  }

  return merged;
}

/** Build browse snapshot for publish, matching iOS `composerRolePublicationSnapshot`. */
export function buildRolePublicationSnapshot(
  role: CastingRoleForm,
  form: Pick<ParsedCastingComposerForm, "location" | "isUnion" | "configuration">,
): RoleClientMatchFilters {
  const locationCityText =
    form.location?.trim() ||
    form.configuration.location_city?.trim() ||
    "";

  const fallback = composerRolePublicationFallback(role, locationCityText, form.isUnion ?? false);
  const overlay = (role.clientMatchFilters ?? null) as RoleClientMatchFilters | null;
  return mergeFilters(overlay, fallback);
}

/** Skills stored on `roles.special_skills` for casting_match notifications. */
export function roleSpecialSkillsForMatching(
  role: CastingRoleForm,
  snapshot: RoleClientMatchFilters,
): string[] {
  return orderedDedupedStyleTags(role.specialSkills, snapshot.genres, snapshot.skills).slice(0, 12);
}

export function parseHeightToCm(value: string | null | undefined): number | null {
  const totalInches = heightToTotalInches(value);
  if (totalInches == null) return null;
  return Math.round(totalInches * 2.54);
}
