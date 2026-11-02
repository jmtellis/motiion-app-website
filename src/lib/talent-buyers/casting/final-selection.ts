import type { CastingCandidateStatus } from "./casting-types";

export const FINAL_SELECTION_STATUSES: readonly CastingCandidateStatus[] = [
  "selected", "availability_requested", "offer_sent", "accepted", "confirmed",
];
export function isFinalSelectionStatus(status: string): boolean {
  return FINAL_SELECTION_STATUSES.includes(status as CastingCandidateStatus);
}

type CandidateSelection = { submission_id?: string | null; status: string; role_ids?: string[] | null };
/** Approved submissions are a shortlist, never an implicit final selection. */
export function finalSubmissionIds(input: {
  roleId: string;
  submissions: { id: string; status: string }[];
  candidates: CandidateSelection[];
  savedIds?: string[] | null;
}): string[] {
  const valid = new Set(input.submissions.filter((submission) => submission.status === "approved").map((submission) => submission.id));
  const selections = new Set((input.savedIds ?? []).filter((id) => valid.has(id)));
  for (const candidate of input.candidates) {
    if (!candidate.role_ids?.includes(input.roleId) || !candidate.submission_id || !valid.has(candidate.submission_id)) continue;
    if (isFinalSelectionStatus(candidate.status)) selections.add(candidate.submission_id);
    else selections.delete(candidate.submission_id);
  }
  return [...selections];
}

export function finalSelectionDisplayStatus<T extends { submissionId?: string; status: CastingCandidateStatus }>(candidate: T, savedIds: ReadonlySet<string>): T {
  return candidate.submissionId && savedIds.has(candidate.submissionId) && !["withdrawn", "not_moving_forward", "declined", "released"].includes(candidate.status)
    ? { ...candidate, status: isFinalSelectionStatus(candidate.status) ? candidate.status : "selected" }
    : candidate;
}
