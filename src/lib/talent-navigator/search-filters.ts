import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import type { SearchFilters } from "@/types/search";

export function navigatorFiltersToSearchFilters(
  filters: TalentNavigatorFilters,
  options?: { navigator?: boolean },
): SearchFilters {
  return {
    keyword: filters.keyword,
    location: filters.locations?.[0] || filters.location,
    style: filters.genres[0] || filters.style,
    subtype: filters.subtype,
    gender: filters.gender,
    ethnicity: filters.ethnicities[0] || filters.ethnicity,
    height: filters.height,
    representation: filters.representation,
    agency: filters.agencies?.[0] || filters.agency,
    unionStatus: filters.unionStatus,
    navigator: options?.navigator ?? true,
  };
}

export function searchFiltersToNavigatorParams(filters: SearchFilters): Partial<TalentNavigatorFilters> {
  const style = filters.style ?? "";
  const ethnicity = filters.ethnicity ?? "";
  const location = filters.location ?? "";
  const agency = filters.agency ?? "";
  return {
    keyword: filters.keyword ?? "",
    location,
    locations: location ? [location] : [],
    style,
    genres: style ? [style] : [],
    subtype: filters.subtype ?? "",
    gender: filters.gender ?? "",
    ethnicity,
    ethnicities: ethnicity ? [ethnicity] : [],
    height: filters.height ?? "",
    representation: filters.representation ?? "",
    agency,
    agencies: agency ? [agency] : [],
    unionStatus: filters.unionStatus ?? "",
  };
}
