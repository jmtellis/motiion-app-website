import { filterSearchProfiles } from "./talent-filter-logic";
import type { SearchFilters, SearchProfileRecord } from "@/types/search";

/** Apply Browse filters to credit matches without changing their evidence or ranking. */
export function filterCreditProfiles(
  profiles: SearchProfileRecord[],
  filters: SearchFilters,
) {
  const styles = filters.styles?.length
    ? filters.styles
    : filters.style
      ? [filters.style]
      : [];
  const base = filterSearchProfiles(profiles, {
    ...filters,
    style: "",
    ethnicity: "",
  });
  const token = (value: string) => value.trim().toLowerCase();
  const any = (
    selected: string[] | undefined,
    actual: string[] | undefined | null,
  ) =>
    !selected?.length ||
    selected.some((value) =>
      actual?.some((item) => token(item) === token(value)),
    );
  return base.filter((profile) => {
    if (filters.location && !profile.location?.trim()) return false;
    if (
      styles.length &&
      !styles.some((style) => filterSearchProfiles([profile], { style }).length)
    )
      return false;
    if (!any(filters.skills, profile.skills)) return false;
    if (
      !any(filters.hairColors, profile.hair_color ? [profile.hair_color] : [])
    )
      return false;
    if (!any(filters.eyeColors, profile.eye_color ? [profile.eye_color] : []))
      return false;
    if (
      filters.ethnicities?.length &&
      !filters.ethnicities.some(
        (ethnicity) => filterSearchProfiles([profile], { ethnicity }).length,
      )
    )
      return false;
    return true;
  });
}
