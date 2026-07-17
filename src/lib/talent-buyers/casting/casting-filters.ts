import type {
  CastingCandidate,
  CastingCandidateSource,
  CastingCandidateStatus,
  CastingRole,
  ReviewStageFilter,
} from "./casting-types";
import { REVIEW_STAGE_FILTERS } from "./casting-statuses";
import {
  mapCastingRoleToMatchFilters,
  resolveCastingRoleMatchAttributes,
} from "./casting-role-match-attributes";
import { EMPTY_NAVIGATOR_FILTERS, type TalentNavigatorFilters } from "@/lib/talent-navigator/types";

export type CastingCandidateFilters = {
  roleId?: string | "all";
  stage?: ReviewStageFilter;
  source?: CastingCandidateSource | "all";
  query?: string;
  sort?: "updated" | "name" | "status";
};

export function getCastingRoleFilters(role: CastingRole): Record<string, unknown> {
  return {
    danceStyles: role.danceStyles ?? [],
    skillLevel: role.skillLevel ?? [],
    ageRange: role.ageRange,
    genderPresentation: role.genderPresentation ?? [],
    heightRange: role.heightRange,
    locationRequirements: role.locationRequirements ?? [],
    unionRequirement: role.unionRequirement,
    specialSkills: role.specialSkills ?? [],
  };
}

export {
  castingConfigurationLocalHireOnly,
  mapCastingRoleToMatchFilters,
  resolveCastingRoleMatchAttributes,
} from "./casting-role-match-attributes";

export function mapCastingRoleToNavigatorFilters(role: CastingRole): TalentNavigatorFilters {
  const attrs = resolveCastingRoleMatchAttributes({
    gender: role.gender,
    ethnicity_preferences: role.ethnicityPreferences,
    union_status: role.unionRequirement,
    match_filters: {
      danceStyles: role.danceStyles,
      gender: role.gender,
      locationRequirements: role.locationRequirements,
      unionRequirement: role.unionRequirement,
    },
  });

  const gender = attrs.gender ?? role.genderPresentation?.[0] ?? "";

  return {
    ...EMPTY_NAVIGATOR_FILTERS,
    openRoleId: role.bridgedRoleId ?? role.id,
    style: attrs.danceStyles[0] ?? "",
    gender,
    location: attrs.locationRequirements[0] ?? "",
    unionStatus: attrs.unionRequirement ?? "",
    ethnicity: attrs.ethnicityPreferences[0] ?? "",
  };
}

export function resolveCastingRolePublicId(role: CastingRole | null | undefined): string | null {
  return role?.bridgedRoleId ?? null;
}

export function invitationMatchesRole(
  invitation: { roleIds: string[] },
  role: CastingRole | null | undefined,
): boolean {
  if (!role) return true;
  // Legacy invites without role scope still appear for every role.
  if (!invitation.roleIds.length) return true;
  const roleIds = roleMatchIds(role);
  return invitation.roleIds.some((id) => roleIds.includes(id));
}

export function referralMatchesRole(
  referral: { roleIds: string[] },
  role: CastingRole | null | undefined,
): boolean {
  if (!role) return true;
  // Unscoped referrals must not appear under every role dropdown.
  if (!referral.roleIds.length) return false;
  const roleIds = roleMatchIds(role);
  return referral.roleIds.some((id) => roleIds.includes(id));
}

export function invitationTalentKeys(invitation: {
  invitedProfileId: string;
  talentUserId?: string;
}): string[] {
  return [invitation.invitedProfileId, invitation.talentUserId].filter(Boolean) as string[];
}

export function filterCastingCandidates(
  candidates: CastingCandidate[],
  filters: CastingCandidateFilters,
): CastingCandidate[] {
  let result = [...candidates];

  if (filters.roleId && filters.roleId !== "all") {
    result = result.filter((c) => c.roleIds.includes(filters.roleId!));
  }

  if (filters.stage && filters.stage !== "all") {
    const stageConfig = REVIEW_STAGE_FILTERS.find((s) => s.id === filters.stage);
    if (stageConfig) {
      result = result.filter((c) => stageConfig.statuses.includes(c.status));
    }
  }

  if (filters.source && filters.source !== "all") {
    result = result.filter((c) => c.source === filters.source);
  }

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.agency?.toLowerCase().includes(q),
    );
  }

  switch (filters.sort) {
    case "name":
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
      break;
    case "status":
      result.sort((a, b) => a.status.localeCompare(b.status));
      break;
    case "updated":
    default:
      result.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      break;
  }

  return result;
}

export function countCandidatesByStatus(
  candidates: CastingCandidate[],
  statuses: CastingCandidateStatus[],
): number {
  return candidates.filter((c) => statuses.includes(c.status)).length;
}

export function countCandidatesForRole(
  candidates: CastingCandidate[],
  roleId: string,
  statuses?: CastingCandidateStatus[],
): number {
  return candidates.filter(
    (c) =>
      c.roleIds.includes(roleId) && (!statuses || statuses.includes(c.status)),
  ).length;
}

export function roleMatchIds(role: CastingRole): string[] {
  const ids = new Set<string>();
  if (role.id) ids.add(role.id);
  if (role.bridgedRoleId) ids.add(role.bridgedRoleId);
  for (const id of role.bridgedRoleIds ?? []) {
    if (id) ids.add(id);
  }
  return [...ids];
}

export function countCandidatesForCastingRole(
  candidates: CastingCandidate[],
  role: CastingRole,
  statuses?: CastingCandidateStatus[],
): number {
  const ids = roleMatchIds(role);
  return candidates.filter(
    (c) =>
      c.roleIds.some((rid) => ids.includes(rid)) && (!statuses || statuses.includes(c.status)),
  ).length;
}
