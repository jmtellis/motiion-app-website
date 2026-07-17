import { computeCastingRoleAvatarFillOrder } from "./casting-role-avatar-grid-layout";
import { roleMatchIds } from "./casting-filters";
import type { CastingCandidate, CastingRole } from "./casting-types";

export type CastingRoleAvatarFace = {
  id: string;
  imageUrl?: string;
  initials: string;
  isSelected: boolean;
};

export type CastingRoleAvatarSlot =
  | { kind: "face"; face: CastingRoleAvatarFace }
  | { kind: "placeholder" }
  | { kind: "overflow"; count: number };

export type CastingRoleAvatarGridConfig = {
  rows: number;
  columns: number;
};

export const CASTING_ROLE_AVATAR_GRID: CastingRoleAvatarGridConfig = {
  rows: 5,
  columns: 6,
};

/** Denser grid for the overview role-card cover. */
export const CASTING_ROLE_OVERVIEW_AVATAR_GRID: CastingRoleAvatarGridConfig = {
  rows: 5,
  columns: 6,
};

export const CASTING_ROLE_AVATAR_ROWS = CASTING_ROLE_AVATAR_GRID.rows;
export const CASTING_ROLE_AVATAR_COLUMNS = CASTING_ROLE_AVATAR_GRID.columns;

const NOT_YET_SUBMITTED_STATUSES = new Set<CastingCandidate["status"]>(["discovered", "invited"]);

export const SELECTED_ROLE_CANDIDATE_STATUSES = new Set<CastingCandidate["status"]>([
  "selected",
  "availability_requested",
  "offer_sent",
  "accepted",
  "confirmed",
]);

export function castingCandidateInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  if (parts.length === 0) return trimmed.charAt(0).toUpperCase();
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function candidateMatchesCastingRole(candidate: CastingCandidate, role: CastingRole): boolean {
  const ids = roleMatchIds(role);
  return candidate.roleIds.some((roleId) => ids.includes(roleId));
}

/** Match iOS role cover previews: anyone with a submission for the role, regardless of review outcome. */
export function hasRoleSubmission(candidate: CastingCandidate, role: CastingRole): boolean {
  if (!candidateMatchesCastingRole(candidate, role)) return false;
  if (candidate.submissionId || candidate.id.startsWith("submission-")) return true;
  return !NOT_YET_SUBMITTED_STATUSES.has(candidate.status);
}

export function getSubmittedCandidatesForCastingRole(
  candidates: CastingCandidate[],
  role: CastingRole,
): CastingCandidate[] {
  return candidates
    .filter((candidate) => hasRoleSubmission(candidate, role))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function countSubmittedCandidatesForCastingRole(
  candidates: CastingCandidate[],
  role: CastingRole,
): number {
  return getSubmittedCandidatesForCastingRole(candidates, role).length;
}

export function buildCastingRoleAvatarSlots(
  candidates: CastingCandidate[],
  role: CastingRole,
  grid: CastingRoleAvatarGridConfig = CASTING_ROLE_AVATAR_GRID,
  options?: {
    columnCount?: number;
    fillOrder?: number[];
  },
): { slots: CastingRoleAvatarSlot[]; showsPlaceholders: boolean } {
  const submitted = getSubmittedCandidatesForCastingRole(candidates, role);
  const showsPlaceholders = role.status !== "filled" && role.status !== "closed";

  const columns = options?.columnCount ?? grid.columns;
  const slotCount = grid.rows * columns;
  const fillOrder =
    options?.fillOrder ??
    computeCastingRoleAvatarFillOrder(grid.rows, grid.columns, { bleed: true });
  const reservesOverflow = submitted.length > slotCount;
  const faceCapacity = reservesOverflow ? Math.max(0, slotCount - 1) : slotCount;
  const visible = submitted.slice(0, faceCapacity);
  const overflowCount = reservesOverflow ? submitted.length - faceCapacity : 0;

  const slots: CastingRoleAvatarSlot[] = Array.from({ length: slotCount }, () => ({ kind: "placeholder" }));

  visible.forEach((candidate, index) => {
    const slotIndex = fillOrder[index];
    if (slotIndex === undefined) return;
    slots[slotIndex] = {
      kind: "face",
      face: {
        id: candidate.id,
        imageUrl: candidate.headshotUrl,
        initials: castingCandidateInitials(candidate.displayName),
        isSelected: SELECTED_ROLE_CANDIDATE_STATUSES.has(candidate.status),
      },
    };
  });

  if (overflowCount > 0) {
    const overflowIndex = fillOrder[visible.length];
    if (overflowIndex !== undefined) {
      slots[overflowIndex] = { kind: "overflow", count: overflowCount };
    }
  }

  return { slots, showsPlaceholders };
}
