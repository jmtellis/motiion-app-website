import type { BuyerOpenRole } from "./open-roles";

/** Explicit professional-tag evidence only, not an eligibility or suitability score. */
export function previewRoleOverlap(profile: { styles?: string[] | null; skills?: string[] | null }, roles: BuyerOpenRole[]) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const styles = new Set((profile.styles ?? []).map(normalize));
  const skills = new Set((profile.skills ?? []).map(normalize));
  const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return roles.flatMap(role => {
    const filters = role.matchFilters ?? {};
    const requestedStyles = role.danceStyles.length ? role.danceStyles : strings(filters.danceStyles).length ? strings(filters.danceStyles) : strings(filters.genres);
    const sharedStyles = [...new Set(requestedStyles.filter(style => styles.has(normalize(style))))];
    const sharedSkills = [...new Set(strings(filters.skills).filter(skill => skills.has(normalize(skill))))];
    return sharedStyles.length || sharedSkills.length ? [{ role, sharedStyles, sharedSkills }] : [];
  });
}
