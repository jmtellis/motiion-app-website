import type { CastingCandidateStatus, CastingRecommendation, CastingCandidateSource } from "./casting-types";
import { normalizeSubmissionStatus, type SubmissionStatus } from "@/lib/talent-buyers/submission-status";

export type CastingStatusConfig = {
  id: CastingCandidateStatus;
  label: string;
  description: string;
  sortOrder: number;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  internalOnly: boolean;
  notifyTalentOnTransition: boolean;
  allowedTransitions: CastingCandidateStatus[];
};

const ALL_STATUSES: CastingCandidateStatus[] = [
  "discovered",
  "invited",
  "submitted",
  "in_review",
  "shortlisted",
  "callback",
  "selected",
  "availability_requested",
  "offer_sent",
  "accepted",
  "confirmed",
  "alternate",
  "not_moving_forward",
  "withdrawn",
  "declined",
  "released",
];

export const CASTING_STATUS_CONFIG: Record<CastingCandidateStatus, CastingStatusConfig> = {
  discovered: {
    id: "discovered",
    label: "Discovered",
    description: "Found via talent search but not yet invited.",
    sortOrder: 10,
    tone: "neutral",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: ["invited", "in_review", "selected", "not_moving_forward"],
  },
  invited: {
    id: "invited",
    label: "Invited",
    description: "Invitation sent; awaiting response.",
    sortOrder: 20,
    tone: "info",
    internalOnly: false,
    notifyTalentOnTransition: true,
    allowedTransitions: ["submitted", "declined", "withdrawn", "not_moving_forward"],
  },
  submitted: {
    id: "submitted",
    label: "Submitted",
    description: "Application or self-tape received.",
    sortOrder: 30,
    tone: "info",
    internalOnly: false,
    notifyTalentOnTransition: false,
    allowedTransitions: ["in_review", "shortlisted", "not_moving_forward", "withdrawn"],
  },
  in_review: {
    id: "in_review",
    label: "In Review",
    description: "Under team evaluation.",
    sortOrder: 40,
    tone: "neutral",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: ["shortlisted", "callback", "selected", "not_moving_forward"],
  },
  shortlisted: {
    id: "shortlisted",
    label: "Shortlisted",
    description: "Strong candidate for further consideration.",
    sortOrder: 50,
    tone: "success",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: ["submitted", "in_review", "callback", "selected", "not_moving_forward"],
  },
  callback: {
    id: "callback",
    label: "Callback",
    description: "Requested for callback or live audition.",
    sortOrder: 60,
    tone: "info",
    internalOnly: false,
    notifyTalentOnTransition: true,
    allowedTransitions: ["shortlisted", "selected", "not_moving_forward"],
  },
  selected: {
    id: "selected",
    label: "Selected",
    description: "Selected for the cast; booking not yet confirmed.",
    sortOrder: 70,
    tone: "success",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: [
      "shortlisted",
      "availability_requested",
      "offer_sent",
      "alternate",
      "not_moving_forward",
    ],
  },
  availability_requested: {
    id: "availability_requested",
    label: "Availability Requested",
    description: "Awaiting availability confirmation.",
    sortOrder: 80,
    tone: "warning",
    internalOnly: false,
    notifyTalentOnTransition: true,
    allowedTransitions: ["offer_sent", "selected", "shortlisted", "declined", "not_moving_forward"],
  },
  offer_sent: {
    id: "offer_sent",
    label: "Offer Sent",
    description: "Offer extended; awaiting response.",
    sortOrder: 90,
    tone: "warning",
    internalOnly: false,
    notifyTalentOnTransition: true,
    allowedTransitions: ["accepted", "declined", "alternate", "not_moving_forward"],
  },
  accepted: {
    id: "accepted",
    label: "Accepted",
    description: "Offer accepted; pending final confirmation.",
    sortOrder: 100,
    tone: "success",
    internalOnly: false,
    notifyTalentOnTransition: false,
    allowedTransitions: ["confirmed", "declined", "released"],
  },
  confirmed: {
    id: "confirmed",
    label: "Confirmed",
    description: "Booked and confirmed for the role.",
    sortOrder: 110,
    tone: "success",
    internalOnly: false,
    notifyTalentOnTransition: false,
    allowedTransitions: ["released"],
  },
  alternate: {
    id: "alternate",
    label: "Alternate",
    description: "Backup candidate for the role.",
    sortOrder: 120,
    tone: "neutral",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: ["selected", "offer_sent", "confirmed", "not_moving_forward"],
  },
  not_moving_forward: {
    id: "not_moving_forward",
    label: "Not Moving Forward",
    description: "No longer under consideration.",
    sortOrder: 130,
    tone: "danger",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: ["in_review", "shortlisted"],
  },
  withdrawn: {
    id: "withdrawn",
    label: "Withdrawn",
    description: "Candidate withdrew from the process.",
    sortOrder: 140,
    tone: "neutral",
    internalOnly: false,
    notifyTalentOnTransition: false,
    allowedTransitions: [],
  },
  declined: {
    id: "declined",
    label: "Declined",
    description: "Candidate declined invitation or offer.",
    sortOrder: 150,
    tone: "neutral",
    internalOnly: false,
    notifyTalentOnTransition: false,
    allowedTransitions: [],
  },
  released: {
    id: "released",
    label: "Released",
    description: "Released from the cast.",
    sortOrder: 160,
    tone: "neutral",
    internalOnly: true,
    notifyTalentOnTransition: false,
    allowedTransitions: [],
  },
};

export function getCastingCandidateStatus(status: CastingCandidateStatus): CastingStatusConfig {
  return CASTING_STATUS_CONFIG[status];
}

export function getAllowedCastingStatusTransitions(
  current: CastingCandidateStatus,
): CastingCandidateStatus[] {
  return CASTING_STATUS_CONFIG[current]?.allowedTransitions ?? [];
}

export function isCastingStatusTransitionAllowed(
  from: CastingCandidateStatus,
  to: CastingCandidateStatus,
): boolean {
  return getAllowedCastingStatusTransitions(from).includes(to);
}

export function shouldNotifyTalentOnStatusTransition(to: CastingCandidateStatus): boolean {
  return CASTING_STATUS_CONFIG[to]?.notifyTalentOnTransition ?? false;
}

export function castingStatusLabel(status: CastingCandidateStatus): string {
  return CASTING_STATUS_CONFIG[status]?.label ?? status;
}

export function castingStatusTone(status: CastingCandidateStatus): CastingStatusConfig["tone"] {
  return CASTING_STATUS_CONFIG[status]?.tone ?? "neutral";
}

export const CASTING_STATUS_TONE_CLASSES: Record<CastingStatusConfig["tone"], string> = {
  neutral: "bg-[var(--tone)] text-[var(--ink-soft)]",
  info: "bg-sky-500/15 text-sky-300",
  success: "bg-emerald-500/15 text-emerald-300",
  warning: "bg-amber-500/15 text-amber-300",
  danger: "bg-rose-500/15 text-rose-300",
};

export function sortCandidatesByStatus<T extends { status: CastingCandidateStatus }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (CASTING_STATUS_CONFIG[a.status]?.sortOrder ?? 999) -
      (CASTING_STATUS_CONFIG[b.status]?.sortOrder ?? 999),
  );
}

/** Map legacy iOS submission status to candidate pipeline status. */
export function submissionStatusToCandidateStatus(status: SubmissionStatus): CastingCandidateStatus {
  switch (status) {
    case "pending":
      return "submitted";
    case "approved":
      return "shortlisted";
    case "rejected":
      return "not_moving_forward";
    case "callback":
      return "callback";
    default:
      return "submitted";
  }
}

/** Map candidate status back to iOS submission status when syncing submissions table. */
export function candidateStatusToSubmissionStatus(status: CastingCandidateStatus): SubmissionStatus | null {
  switch (status) {
    case "submitted":
    case "in_review":
      return "pending";
    case "shortlisted":
    case "selected":
      return "approved";
    case "callback":
      return "callback";
    case "not_moving_forward":
    case "declined":
    case "withdrawn":
    case "released":
      return "rejected";
    default:
      return null;
  }
}

export function normalizeCandidateStatus(value: string | null | undefined): CastingCandidateStatus {
  if (!value) return "discovered";
  const normalized = value.toLowerCase().replace(/-/g, "_") as CastingCandidateStatus;
  if (ALL_STATUSES.includes(normalized)) return normalized;

  const submission = normalizeSubmissionStatus(value);
  return submissionStatusToCandidateStatus(submission);
}

export function castingSourceLabel(source: CastingCandidateSource): string {
  switch (source) {
    case "talent_search":
      return "Talent search";
    case "invitation":
      return "Invitation";
    case "referral":
      return "Referral";
    case "public_submission":
      return "Public submission";
    case "manual":
      return "Manual";
    case "external_platform":
      return "External";
    case "walk_in":
      return "Walk-in";
    default:
      return source;
  }
}

export const CASTING_CANDIDATE_SOURCES: CastingCandidateSource[] = [
  "talent_search",
  "invitation",
  "referral",
  "public_submission",
  "manual",
  "external_platform",
  "walk_in",
];

export function recommendationLabel(value: CastingRecommendation | null | undefined): string {
  switch (value) {
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
    default:
      return "—";
  }
}

export const NEW_SUBMISSION_CANDIDATE_STATUSES: CastingCandidateStatus[] = ["submitted", "in_review"];

/** Pre-submission pipeline states (search/referral/invite). Not reviewable yet. */
export const PRE_SUBMISSION_CANDIDATE_STATUSES: CastingCandidateStatus[] = [
  "discovered",
  "invited",
];

/** Candidates who have submitted (or progressed past invitation) appear in Review. */
export const REVIEWABLE_CANDIDATE_STATUSES: CastingCandidateStatus[] = ALL_STATUSES.filter(
  (status) => !PRE_SUBMISSION_CANDIDATE_STATUSES.includes(status),
);

export function isReviewableCastingCandidate(candidate: {
  status: CastingCandidateStatus;
  submissionId?: string | null;
}): boolean {
  if (candidate.submissionId) return true;
  return REVIEWABLE_CANDIDATE_STATUSES.includes(candidate.status);
}

export const REVIEW_STAGE_FILTERS = [
  { id: "all" as const, label: "All", statuses: REVIEWABLE_CANDIDATE_STATUSES },
  {
    id: "new" as const,
    label: "New",
    statuses: NEW_SUBMISSION_CANDIDATE_STATUSES,
  },
  {
    id: "in_review" as const,
    label: "In Review",
    statuses: ["in_review", "discovered"] as CastingCandidateStatus[],
  },
  {
    id: "shortlisted" as const,
    label: "Shortlisted",
    statuses: ["shortlisted", "callback"] as CastingCandidateStatus[],
  },
  {
    id: "callback" as const,
    label: "Callback",
    statuses: ["callback"] as CastingCandidateStatus[],
  },
  {
    id: "selected" as const,
    label: "Selected",
    statuses: ["selected", "availability_requested", "offer_sent", "accepted"] as CastingCandidateStatus[],
  },
  {
    id: "not_moving_forward" as const,
    label: "Not Moving Forward",
    statuses: ["not_moving_forward", "declined", "withdrawn", "released"] as CastingCandidateStatus[],
  },
];

export const CAST_STATUSES: CastingCandidateStatus[] = [
  "selected",
  "availability_requested",
  "offer_sent",
  "accepted",
  "declined",
  "confirmed",
  "alternate",
  "released",
];
