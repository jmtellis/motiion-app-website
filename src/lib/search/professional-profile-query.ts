import type { SearchFilters } from "@/types/search";
import { genderFilterVariants } from "./talent-filter-logic";

export const TALENT_SUBTYPES = ["dancer", "choreographer", "instructor"] as const;
const KEYSET_BATCH_SIZE = 100;

export const PROFESSIONAL_PROFILE_SELECT =
  "id,user_id,slug,subtype,styles,skills,gender,ethnicity,union_status,location_city,location_region,is_verified,agency_name";

/** Talent-only verified profile source (excludes industry professionals). */
export function buildProfessionalProfilesQueryPath(filters: SearchFilters, cursor: string | null): string {
  const subtypeFilter = TALENT_SUBTYPES.map((value) => `"${value}"`).join(",");
  const params = [
    `select=${PROFESSIONAL_PROFILE_SELECT}`,
    "is_verified=eq.true",
    `subtype=in.(${subtypeFilter})`,
    "order=id.asc",
    `limit=${KEYSET_BATCH_SIZE}`,
  ];

  if (cursor) {
    params.push(`id=gt.${encodeURIComponent(cursor)}`);
  }

  if (filters.gender?.trim()) {
    const variants = genderFilterVariants(filters.gender).map((value) => `"${value.replace(/"/g, '\\"')}"`);
    params.push(`gender=in.(${variants.join(",")})`);
  }

  return `talent_professional_profiles?${params.join("&")}`;
}

