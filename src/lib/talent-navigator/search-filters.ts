import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import type { SearchFilters } from "@/types/search";

export function navigatorFiltersToSearchFilters(
  filters: TalentNavigatorFilters,
  options?: { navigator?: boolean },
): SearchFilters {
  return {
    keyword: filters.keyword,
    location: filters.location,
    style: filters.style,
    subtype: filters.subtype,
    gender: filters.gender,
    ethnicity: filters.ethnicity,
    height: filters.height,
    representation: filters.representation,
    agency: filters.agency,
    unionStatus: filters.unionStatus,
    navigator: options?.navigator ?? true,
  };
}

export function searchFiltersToNavigatorParams(filters: SearchFilters): Partial<TalentNavigatorFilters> {
  return {
    keyword: filters.keyword ?? "",
    location: filters.location ?? "",
    style: filters.style ?? "",
    subtype: filters.subtype ?? "",
    gender: filters.gender ?? "",
    ethnicity: filters.ethnicity ?? "",
    height: filters.height ?? "",
    representation: filters.representation ?? "",
    agency: filters.agency ?? "",
    unionStatus: filters.unionStatus ?? "",
  };
}
