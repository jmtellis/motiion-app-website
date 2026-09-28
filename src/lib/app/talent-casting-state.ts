export type TalentCastingOutcome = "submitted" | "selected" | "not_selected" | "casting_closed";

export type CastingBrowseBucket = "open" | "invited" | "submitted" | "hidden";

const CASTING_NOTIFICATION_TYPES = new Set([
  "casting_match",
  "casting_decision",
  "casting_submission_outcome",
  "casting_update",
]);

/** Talent-facing outcome. Interim hirer statuses stay hidden until the casting is finalized. */
export function resolveTalentCastingOutcome(input: {
  isCastingFinalized: boolean;
  isActive: boolean;
  deadlinePassed: boolean;
  submissionId: string;
  finalSelectIds: string[];
}): TalentCastingOutcome {
  if (input.isCastingFinalized) {
    return input.finalSelectIds.includes(input.submissionId) ? "selected" : "not_selected";
  }
  if (!input.isActive || input.deadlinePassed) return "casting_closed";
  return "submitted";
}

export function outcomeLabel(outcome: TalentCastingOutcome) {
  if (outcome === "selected") return "Selected";
  if (outcome === "not_selected") return "Not selected";
  if (outcome === "casting_closed") return "Casting closed";
  return "Submitted";
}

/**
 * One role lands in a single bucket. A submitted role is a submission, a pending
 * invite stays out of open calls, and a pass hides it from browse.
 */
export function classifyCastingRole(input: {
  submitted: boolean;
  invitedPending: boolean;
  passed: boolean;
  publicOpen: boolean;
}): CastingBrowseBucket {
  if (input.submitted) return "submitted";
  if (input.invitedPending) return "invited";
  if (input.passed) return "hidden";
  if (input.publicOpen) return "open";
  return "hidden";
}

/** Closed submissions are finalized castings. Deadline alone does not close the tab. */
export function submissionIsClosed(isCastingFinalized: boolean) {
  return isCastingFinalized;
}

export type CastingSubmitState =
  | { kind: "submitted" }
  | { kind: "external" }
  | { kind: "closed" }
  | { kind: "invite_only" }
  | { kind: "agency_only" }
  | { kind: "roster_only" }
  | { kind: "submit" };

export function roleSubmitState(input: {
  alreadySubmitted: boolean;
  isActive: boolean;
  isCastingFinalized: boolean;
  deadlinePassed: boolean;
  externalSubmissionUrl: string | null;
  invited: boolean;
  hasAgency: boolean;
  agencyRequired: boolean;
  submitterPolicy: string | null;
  visibilityPresentation: string | null;
}): CastingSubmitState {
  if (input.alreadySubmitted) return { kind: "submitted" };
  if (input.externalSubmissionUrl) return { kind: "external" };
  if (!input.isActive || input.isCastingFinalized || input.deadlinePassed) return { kind: "closed" };

  const policy = input.submitterPolicy?.trim() || null;
  const presentation = input.visibilityPresentation?.trim() || null;
  if ((policy === "invited_only" || presentation === "invite_only") && !input.invited) {
    return { kind: "invite_only" };
  }
  if ((policy === "represented_only" || input.agencyRequired) && !input.hasAgency) {
    return { kind: "agency_only" };
  }
  if (policy === "roster_only") return { kind: "roster_only" };
  return { kind: "submit" };
}

export function isPendingCastingInviteNotification(row: { type: string; data?: unknown }) {
  if (row.type !== "casting_update") return false;
  const data = notificationData(row.data);
  const flag = data?.casting_invite_pending;
  return flag === true || flag === "true";
}

export function castingNotificationHref(row: { type: string; data?: unknown }) {
  if (isPendingCastingInviteNotification(row)) return null;
  if (!CASTING_NOTIFICATION_TYPES.has(row.type)) return null;
  const roleId = text(notificationData(row.data)?.role_id);
  if (!roleId) return null;
  return `/opportunities?casting=${encodeURIComponent(roleId)}`;
}

function notificationData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
