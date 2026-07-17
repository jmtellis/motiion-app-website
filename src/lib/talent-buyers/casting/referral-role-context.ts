export type ReferralRoleOption = {
  id: string;
  name: string;
  bridgedRoleId?: string;
  description?: string;
  gender?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  ethnicityPreferences?: string[];
  specialSkills?: string[];
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  unionStatus?: string;
  peopleNeeded?: number | null;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function dedupeReferralRoles(roles: ReferralRoleOption[]): ReferralRoleOption[] {
  const byTitle = new Map<string, ReferralRoleOption>();
  for (const role of roles) {
    const key = normalizeTitle(role.name || role.id);
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, role);
      continue;
    }
    if (!existing.bridgedRoleId && role.bridgedRoleId) {
      byTitle.set(key, role);
    }
  }
  return [...byTitle.values()];
}

export function formatReferralRoleSummary(role: ReferralRoleOption): string {
  const parts: string[] = [];
  if (role.gender?.trim()) parts.push(role.gender.trim());
  if (role.ageMin != null || role.ageMax != null) {
    if (role.ageMin != null && role.ageMax != null) parts.push(`Ages ${role.ageMin}-${role.ageMax}`);
    else if (role.ageMin != null) parts.push(`Ages ${role.ageMin}+`);
    else if (role.ageMax != null) parts.push(`Ages up to ${role.ageMax}`);
  }
  if (role.heightMinCm != null || role.heightMaxCm != null) {
    if (role.heightMinCm != null && role.heightMaxCm != null) {
      parts.push(`Height ${role.heightMinCm}-${role.heightMaxCm} cm`);
    } else if (role.heightMinCm != null) {
      parts.push(`Height ${role.heightMinCm}+ cm`);
    } else if (role.heightMaxCm != null) {
      parts.push(`Height up to ${role.heightMaxCm} cm`);
    }
  }
  if (role.unionStatus?.trim()) parts.push(role.unionStatus.trim());
  if (role.peopleNeeded != null && role.peopleNeeded > 0) {
    parts.push(`${role.peopleNeeded} needed`);
  }
  const skills = (role.specialSkills ?? []).filter(Boolean).slice(0, 4);
  if (skills.length) parts.push(skills.join(" · "));
  const ethnicity = (role.ethnicityPreferences ?? []).filter(Boolean).slice(0, 3);
  if (ethnicity.length) parts.push(ethnicity.join(" · "));
  return parts.join(" · ");
}
