import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";

export type BuyerOpenRole = {
  id: string;
  name: string;
  projectId: string;
  projectTitle: string;
  castingId: string;
  castingTitle: string;
  matchFilters: Record<string, unknown> | null;
  gender: string | null;
  unionStatus: string | null;
  ethnicityPreferences: string[];
  locationRequirements: string[];
  danceStyles: string[];
};

const CLOSED_CASTING_STATUSES = new Set(["closed", "archived", "draft"]);
const CLOSED_ROLE_STATUSES = new Set(["filled", "closed"]);

export function isBuyerOpenRoleStatus(
  castingStatus: string | null | undefined,
  roleStatus: string | null | undefined,
): boolean {
  if (castingStatus && CLOSED_CASTING_STATUSES.has(castingStatus)) return false;
  if (roleStatus && CLOSED_ROLE_STATUSES.has(roleStatus)) return false;
  return true;
}

export function mapOpenRoleToNavigatorFilters(
  role: BuyerOpenRole,
  base: TalentNavigatorFilters = EMPTY_NAVIGATOR_FILTERS,
): TalentNavigatorFilters {
  const matchFilters = role.matchFilters ?? {};
  const danceStyles =
    role.danceStyles.length > 0
      ? role.danceStyles
      : (Array.isArray(matchFilters.danceStyles)
          ? (matchFilters.danceStyles as string[])
          : Array.isArray(matchFilters.genres)
            ? (matchFilters.genres as string[])
            : []);
  const genderPresentation = Array.isArray(matchFilters.genderPresentation)
    ? (matchFilters.genderPresentation as string[])
    : [];
  const locationRequirements =
    role.locationRequirements.length > 0
      ? role.locationRequirements
      : (Array.isArray(matchFilters.locationRequirements)
          ? (matchFilters.locationRequirements as string[])
          : typeof matchFilters.location === "string" && matchFilters.location.trim()
            ? [matchFilters.location.trim()]
            : []);

  return {
    ...EMPTY_NAVIGATOR_FILTERS,
    openRoleId: role.id,
    keyword: base.keyword,
    style: danceStyles[0] ?? base.style,
    gender: role.gender ?? genderPresentation[0] ?? base.gender,
    location: locationRequirements[0] ?? base.location,
    unionStatus: role.unionStatus ?? (matchFilters.unionRequirement as string | undefined) ?? base.unionStatus,
    ethnicity: role.ethnicityPreferences[0] ?? base.ethnicity,
    representation: base.representation,
    agency: base.agency,
    height: base.height,
    availability: base.availability,
    experience: base.experience,
    subtype: base.subtype,
  };
}

export function clearOpenRoleFromNavigatorFilters(
  filters: TalentNavigatorFilters,
): TalentNavigatorFilters {
  return {
    ...filters,
    openRoleId: "",
  };
}
