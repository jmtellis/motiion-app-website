import { isPendingCastingInviteNotification } from "@/lib/app/talent-casting-state";

/** Matches iOS `isAlertsInboxType`: messages and pending requests stay in Inbox. */
const HIDDEN_ALERT_TYPES = new Set([
  "message",
  "message_request",
  "request_pending_availability",
  "request_pending_booking_confirm",
  "request_pending_size_sheet",
  "job_member_added",
  "casting_match",
  "booking_confirmation",
  "activity_invite_pending",
  "collaborator_invite_pending",
  "activity_featured_talent_invite",
]);

const ACTOR_ID_KEYS = [
  "actor_id",
  "actorId",
  "responder_id",
  "responderId",
  "reviewer_id",
  "reviewerId",
  "requester_id",
  "requesterId",
  "inviter_id",
  "inviterId",
  "poster_id",
  "posterId",
  "creator_id",
  "creatorId",
  "student_id",
  "studentId",
  "invited_user_id",
  "invitedUserId",
  "talent_id",
  "talentId",
  "respondent_user_id",
  "responding_talent_id",
];

const ACTOR_NAME_KEYS = [
  "actor_display_name",
  "actorName",
  "actor_name",
  "responder_display_name",
  "responderName",
  "responder_name",
  "requester_display_name",
  "requesterName",
  "requester_name",
  "inviter_display_name",
  "inviterName",
  "inviter_name",
  "poster_display_name",
  "posterName",
  "poster_name",
  "reviewer_name",
  "reviewerName",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function payload(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** High-level alerts only, matching iOS `isVisibleInAlertsInbox`. */
export function isVisibleAlertNotification(row: { type: string; data?: unknown }) {
  if (HIDDEN_ALERT_TYPES.has(row.type)) return false;
  if (isPendingCastingInviteNotification(row)) return false;
  if (row.type === "motiion_credit_offer" && payload(row.data)?.offer_status === "cancelled") {
    return false;
  }
  return true;
}

/** Same key order as iOS `routedActorUserId`. */
export function notificationActorUserId(data: unknown) {
  const record = payload(data);
  if (!record) return null;
  for (const key of ACTOR_ID_KEYS) {
    const value = textValue(record[key]);
    if (value && UUID_PATTERN.test(value)) return value;
  }
  return null;
}

export function notificationActorName(data: unknown) {
  const record = payload(data);
  if (!record) return null;
  for (const key of ACTOR_NAME_KEYS) {
    const value = textValue(record[key]);
    if (value) return value;
  }
  return null;
}

export type NotificationViewerRole = "talent" | "industry" | "community";

const COORDINATION_NOTIFICATION_TYPES = new Set([
  "request_resolved_availability", "request_resolved_booking_confirm", "request_resolved_size_sheet",
  "booking_status_changed", "booking_handoff", "booking_hold_placed", "booking_hold_released",
]);

export function isCoordinationNotification(row: { type: string }) {
  return COORDINATION_NOTIFICATION_TYPES.has(row.type);
}

/** Older handoff/hold payloads omit recipient_role; use the authenticated workspace. */
export function coordinationNotificationHref(
  row: { type: string; data?: unknown },
  viewerRole?: NotificationViewerRole,
) {
  if (!isCoordinationNotification(row)) return null;
  const data = payload(row.data);
  const recipientRole = textValue(data?.recipient_role)?.toLowerCase();
  const role = viewerRole ?? recipientRole;
  if (role === "community") return "/inbox";
  if (role === "talent") {
    const bookingId = textValue(data?.booking_id ?? data?.bookingId);
    const query = new URLSearchParams({ view: "projects" });
    if (bookingId && UUID_PATTERN.test(bookingId)) query.set("booking", bookingId);
    return `/activities?${query}`;
  }
  const projectId = textValue(data?.project_id ?? data?.projectId);
  if (projectId && UUID_PATTERN.test(projectId)) return `/projects/${projectId}/coordination`;
  return "/messages";
}
