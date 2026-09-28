import type { HomePendingRequest, InboxConversation } from "@/types/app";

export type ChatInboxFilter = "primary" | "general" | "requests";

const INDUSTRY_ROLES = new Set(["choreographer", "casting", "organizer"]);

const PRIMARY_CONTEXT_TYPES = new Set([
  "job",
  "class",
  "session",
  "event",
  "booking",
  "project",
]);

const ACTIVITY_CONTEXT_TYPES = new Set(["event", "class", "session"]);

/**
 * Mirrors iOS MessagingInboxThreadCategory.classify.
 * Requests are a separate surface, not conversation rows.
 */
export function classifyConversationPartition(
  conversation: InboxConversation,
): Exclude<ChatInboxFilter, "requests"> {
  const contextType = conversation.context_type?.trim().toLowerCase() ?? "";

  if (contextType === "profile_review") return "general";
  if (contextType === "platform_announcement") return "primary";
  if (!conversation.participant_user_id) return "primary";

  const role = conversation.participant_role?.trim().toLowerCase() ?? "";
  if (role && INDUSTRY_ROLES.has(role)) return "primary";
  if (contextType && PRIMARY_CONTEXT_TYPES.has(contextType)) return "primary";
  return "general";
}

export function filterForOpening(
  conversation: InboxConversation,
): Exclude<ChatInboxFilter, "requests"> {
  return classifyConversationPartition(conversation) === "general" ? "general" : "primary";
}

export function isMotiionBrandedThread(conversation: InboxConversation) {
  const contextType = conversation.context_type?.trim().toLowerCase() ?? "";
  return contextType === "profile_review" || contextType === "platform_announcement";
}

export function isOneWayMotiionThread(conversation: InboxConversation) {
  return isMotiionBrandedThread(conversation);
}

export function isGroupThread(conversation: InboxConversation) {
  return !conversation.participant_user_id && !isMotiionBrandedThread(conversation);
}

export function inboxDisplayName(conversation: InboxConversation) {
  return isMotiionBrandedThread(conversation) ? "Motiion" : conversation.participant_name;
}

export function activityHref(conversation: InboxConversation) {
  const contextType = conversation.context_type?.trim().toLowerCase() ?? "";
  if (!conversation.context_id || !ACTIVITY_CONTEXT_TYPES.has(contextType)) return null;
  return `/activity/${conversation.context_id}`;
}

/** Rows with no human-authored message stay hidden. System lines do not count. */
export function conversationsWithInboxActivity(conversations: InboxConversation[]) {
  return conversations.filter((conversation) => Boolean(conversation.last_message_sender_id));
}

export function filterConversationsByPartition(
  conversations: InboxConversation[],
  partition: Exclude<ChatInboxFilter, "requests">,
) {
  return conversationsWithInboxActivity(conversations).filter(
    (conversation) => classifyConversationPartition(conversation) === partition,
  );
}

export function partitionUnreadCount(
  conversations: InboxConversation[],
  partition: Exclude<ChatInboxFilter, "requests">,
) {
  return filterConversationsByPartition(conversations, partition).reduce(
    (sum, conversation) => sum + Number(conversation.unread_count ?? 0),
    0,
  );
}

export function requestsChipCount(pendingCount: number, messageRequestCount: number) {
  return pendingCount + messageRequestCount;
}

/** Unread threads + DM requests + home pending rows. Matches iOS InboxTabBadgeSupport. */
export function inboxNavBadgeCount(
  conversations: InboxConversation[],
  messageRequestCount: number,
  pendingCount: number,
) {
  const unread = conversationsWithInboxActivity(conversations).reduce(
    (sum, conversation) => sum + Number(conversation.unread_count ?? 0),
    0,
  );
  return unread + messageRequestCount + pendingCount;
}

export function formatInboxTimestamp(value: string | null, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const startOfDay = (input: Date) => {
    const copy = new Date(input);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const dayDelta = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (dayDelta === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta > 1 && dayDelta < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

export type ChatRequestRow = {
  id: string;
  title: string;
  detail: string;
  kind: string;
  coverUrl: string | null;
  href: string | null;
};

export function mapPendingRequestsToChatRows(
  requests: HomePendingRequest[],
): ChatRequestRow[] {
  return requests.map((item) => ({
    id: item.id,
    title: item.title || item.header_text || "Request",
    detail: item.detail_text || item.inviter_name || requestKindLabel(item.request_kind),
    kind: item.request_kind,
    coverUrl: item.cover_url ?? item.inviter_avatar_url,
    href: item.ref_activity_id
      ? `/activity/${item.ref_activity_id}`
      : item.ref_role_id
        ? `/casting/${item.ref_role_id}`
        : null,
  }));
}

function requestKindLabel(kind: string) {
  return kind.replace(/_/g, " ");
}
