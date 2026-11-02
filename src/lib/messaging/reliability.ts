import type { ConversationMessage } from "@/lib/app/conversations";
import { validCalendarDate } from "@/lib/app/calendar-events";

export const INBOX_CHANGED_EVENT = "motiion:inbox-changed";

export function notifyInboxChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(INBOX_CHANGED_EVENT));
}

/** A refreshed server page must not erase a pending send or a failed retry. */
export function mergeConversationMessages(
  current: ConversationMessage[],
  incoming: ConversationMessage[],
  pendingIds: ReadonlySet<string>,
) {
  const merged = new Map(incoming.map((message) => [message.id, message]));
  for (const message of current) {
    if (pendingIds.has(message.id) && !merged.has(message.id)) merged.set(message.id, message);
  }
  return [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function conversationDraftKey(userId: string, conversationId: string) {
  return `${userId}:${conversationId}`;
}

/** Requests expose date-only / wall-clock schedule copy; parsing as UTC shifts the day. */
export function friendlyRequestSchedule(value: string | null | undefined): string | null {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s*·\s*(\d{2}):(\d{2})(?::\d{2})?)?$/);
  if (!match || !validCalendarDate(match[1])) return null;
  const date = new Date(`${match[1]}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!match[2]) return day;
  const hour = Number(match[2]); const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  return `${day} at ${hour % 12 || 12}${minute ? `:${match[3]}` : ""}${hour >= 12 ? "pm" : "am"}`;
}
