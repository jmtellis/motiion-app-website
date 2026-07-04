import Image from "next/image";

import type { InboxConversation } from "@/types/app";

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InboxList({
  conversations,
  error,
  hideHeader = false,
  variant = "default",
}: {
  conversations: InboxConversation[];
  error: string | null;
  hideHeader?: boolean;
  variant?: "default" | "dashboard";
}) {
  const isDashboard = variant === "dashboard";

  return (
    <div className="space-y-6">
      {hideHeader ? null : (
        <header className="space-y-2">
          <p
            className={`text-xs font-semibold tracking-[0.2em] uppercase ${
              isDashboard ? "text-white/42" : "text-[var(--accent)]"
            }`}
          >
            Inbox
          </p>
          <h1 className={`text-3xl font-semibold tracking-tight ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
            Messages
          </h1>
          <p className={`text-base ${isDashboard ? "text-white/58" : "text-[var(--ink-soft)]"}`}>
            Conversations from jobs, classes, sessions, and direct messages.
          </p>
        </header>
      )}

      {error ? (
        <p
          className={`rounded-[var(--radius-field)] border px-4 py-3 text-sm ${
            isDashboard
              ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          Could not load inbox: {error}
        </p>
      ) : null}

      {conversations.length ? (
        <ul className={isDashboard ? "bd-inbox-list" : "ui-card divide-y divide-[var(--line)] overflow-hidden"}>
          {conversations.map((row) => (
            <li key={row.conversation_id}>
              <div className="flex gap-4 px-0 py-4">
                <ConversationAvatar
                  url={row.participant_avatar_url}
                  name={row.participant_name}
                  variant={variant}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate text-base font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
                        {row.participant_name}
                      </p>
                      {row.context_title ? (
                        <p className={`truncate text-xs ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
                          {row.context_title}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      {row.last_message_at ? (
                        <p className={`text-xs ${isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
                          {formatWhen(row.last_message_at)}
                        </p>
                      ) : null}
                      {row.unread_count > 0 ? (
                        <span className="mt-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
                          {row.unread_count > 99 ? "99+" : row.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className={`mt-1 line-clamp-2 text-sm ${isDashboard ? "text-white/58" : "text-[var(--ink-soft)]"}`}>
                    {row.last_message_body?.trim() || "No messages yet"}
                  </p>
                  {row.context_type ? (
                    <p className={`mt-1 text-xs tracking-wide uppercase ${isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
                      {row.context_type.replace(/_/g, " ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`px-6 py-10 text-center ${isDashboard ? "bd-muted-panel" : "ui-muted-panel"}`}>
          <h2 className={`text-xl font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
            No conversations yet
          </h2>
          <p className={`mx-auto mt-2 max-w-md text-sm ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
            When you message talent or respond to invites, threads will show up here.
          </p>
        </div>
      )}

      <p className={isDashboard ? "bd-caption" : "text-sm text-[var(--ink-soft)]"}>
        Full messaging is available in the Motiion iOS app. Web inbox is read-only for now.
      </p>
    </div>
  );
}

function ConversationAvatar({
  url,
  name,
  variant = "default",
}: {
  url: string | null;
  name: string;
  variant?: "default" | "dashboard";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <div className={`relative size-12 shrink-0 overflow-hidden rounded-full ${variant === "dashboard" ? "bg-white/8" : "bg-[var(--tone)]"}`}>
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#4a7cff] text-sm font-semibold text-white">
      {initials || "?"}
    </div>
  );
}
