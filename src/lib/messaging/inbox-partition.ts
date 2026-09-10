import type { HomePendingRequest, InboxConversation } from "@/types/app";

export type ChatInboxFilter = "primary" | "general" | "requests";

const PRIMARY_CONTEXT_TYPES = new Set([
  "job",
  "class",
  "session",
  "event",
  "booking",
  "project",
  "casting",
  "role",
]);

/**
 * Mirrors iOS MessagingInboxThreadCategory heuristics for Primary vs General.
 * Requests are a separate surface (pending home + message requests), not conversation rows.
 */
export function classifyConversationPartition(
  conversation: InboxConversation,
): Exclude<ChatInboxFilter, "requests"> {
  const contextType = conversation.context_type?.trim().toLowerCase() ?? "";
  const title = `${conversation.context_title ?? ""} ${conversation.participant_name}`.toLowerCase();

  if (title.includes("profile review") || title.includes("motiion review")) {
    return "general";
  }
  if (title.includes("announcement") || conversation.type === "announcement") {
    return "primary";
  }
  if (contextType && PRIMARY_CONTEXT_TYPES.has(contextType)) {
    return "primary";
  }
  if (conversation.type === "group" && conversation.context_title?.trim()) {
    return "primary";
  }
  return "general";
}

export function filterConversationsByPartition(
  conversations: InboxConversation[],
  partition: Exclude<ChatInboxFilter, "requests">,
) {
  return conversations.filter(
    (conversation) => classifyConversationPartition(conversation) === partition,
  );
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
