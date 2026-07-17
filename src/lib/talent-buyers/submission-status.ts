/** iOS-canonical submission statuses (SubmissionStatus in Motiion iOS). */
export const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "callback"] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, SubmissionStatus> = {
  submitted: "pending",
  under_review: "pending",
  pending: "pending",
  shortlisted: "approved",
  approved: "approved",
  accepted: "approved",
  declined: "rejected",
  rejected: "rejected",
  callback: "callback",
};

export function normalizeSubmissionStatus(value: string | null | undefined): SubmissionStatus {
  if (!value) return "pending";
  return LEGACY_STATUS_MAP[value.toLowerCase()] ?? "pending";
}

export function submissionStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "approved":
      return "Shortlisted";
    case "rejected":
      return "Not Selected";
    case "callback":
      return "Callback Requested";
    default:
      return "Pending Review";
  }
}

export const SUBMISSION_STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: "bg-[var(--tone)] text-[var(--ink-soft)]",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  callback: "bg-sky-100 text-sky-800",
};

export function isValidSubmissionStatus(value: string): value is SubmissionStatus {
  return SUBMISSION_STATUSES.includes(value as SubmissionStatus);
}
