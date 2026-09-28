"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversationParticipantsSheet } from "@/components/messaging/ConversationParticipantsSheet";
import { MessageAttachmentBubble } from "@/components/messaging/MessageAttachmentBubble";
import { MessageLinkBubble } from "@/components/messaging/MessageLinkBubble";
import {
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
  type ConversationMessage,
} from "@/lib/app/conversations";
import {
  parseMessagingAttachmentPayload,
  parseMessagingLinkPayload,
} from "@/lib/messaging/attachment-payload";
import {
  activityHref,
  inboxDisplayName,
  isGroupThread,
  isMotiionBrandedThread,
  isOneWayMotiionThread,
} from "@/lib/messaging/inbox-partition";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { InboxConversation } from "@/types/app";

const drafts = new Map<string, string>();

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const start = (input: Date) => {
    const copy = new Date(input);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const delta = Math.round((start(now).getTime() - start(date).getTime()) / 86_400_000);
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  if (delta > 1 && delta < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ConversationPane({
  conversation,
  currentUserId,
  variant = "default",
}: {
  conversation: InboxConversation;
  currentUserId: string;
  variant?: "default" | "dashboard";
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => drafts.get(conversation.conversation_id) ?? "");
  const [failedId, setFailedId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [readOnlyNote, setReadOnlyNote] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDashboard = variant === "dashboard";
  const conversationId = conversation.conversation_id;
  const displayName = inboxDisplayName(conversation);
  const group = isGroupThread(conversation);
  const oneWay = isOneWayMotiionThread(conversation);
  const profileHref = conversation.participant_user_id ? `/profile/${conversation.participant_user_id}` : null;
  const headerHref = profileHref ?? activityHref(conversation);

  const loadMessages = useCallback(async () => {
    const result = await fetchConversationMessages(conversationId);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setMessages(result.messages);
      setFailedId(null);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;
    void fetchConversationMessages(conversationId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setMessages(result.messages);
        setFailedId(null);
      }
      setLoading(false);
    });
    void markConversationRead(conversationId);
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void loadMessages();
          void markConversationRead(conversationId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (oneWay || !conversation.participant_user_id) return;
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    let cancelled = false;

    void supabase
      .from("message_requests")
      .select("id")
      .eq("sender_id", currentUserId)
      .eq("receiver_id", conversation.participant_user_id)
      .eq("status", "pending")
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setPendingRequest(Boolean(data?.length));
      });

    return () => {
      cancelled = true;
    };
  }, [conversation.participant_user_id, currentUserId, oneWay]);

  useEffect(() => {
    if (oneWay || conversation.participant_user_id || !conversation.context_id) return;
    const contextType = conversation.context_type?.toLowerCase() ?? "";
    if (!["event", "class", "session"].includes(contextType)) return;
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    let cancelled = false;

    void supabase
      .rpc("get_activity_attendee_message_channel", { p_activity_id: conversation.context_id })
      .then(({ data }) => {
        if (cancelled || !data || typeof data !== "object") return;
        const channel = data as {
          allow_attendee_replies?: boolean;
          can_manage?: boolean;
          exists?: boolean;
        };
        if (channel.exists && !channel.can_manage && !channel.allow_attendee_replies) {
          setReadOnlyNote("Only the organizer can send messages in this thread.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversation.context_id, conversation.context_type, conversation.participant_user_id, oneWay]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function updateDraft(value: string) {
    setDraft(value);
    drafts.set(conversationId, value);
  }

  function handleSend(retryBody?: string) {
    const body = (retryBody ?? draft).trim();
    if (!body || isSending || oneWay || pendingRequest || readOnlyNote) return;

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: ConversationMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_name: "You",
      sender_avatar_url: null,
      body,
      message_type: "text",
      created_at: new Date().toISOString(),
      deleted_at: null,
    };

    setMessages((current) => [...current.filter((message) => message.id !== failedId), optimistic]);
    setFailedId(null);
    if (!retryBody) updateDraft("");
    setError(null);

    setIsSending(true);
    void sendConversationMessage(conversationId, body)
      .then(async (result) => {
        if (!result.ok) {
          setFailedId(optimisticId);
          setError(result.error ?? "Could not send message.");
          return;
        }
        drafts.delete(conversationId);
        await loadMessages();
      })
      .finally(() => setIsSending(false));
  }

  const composerHidden = oneWay || pendingRequest || Boolean(readOnlyNote);
  const composerNote = oneWay
    ? "Messages from Motiion aren't replies."
    : pendingRequest
      ? "Message request sent — waiting for acceptance."
      : readOnlyNote;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${isDashboard ? "border-white/8" : "border-[var(--line)]"}`}>
        <PaneAvatar
          url={isMotiionBrandedThread(conversation) ? null : conversation.participant_avatar_url}
          name={displayName}
          branded={isMotiionBrandedThread(conversation)}
        />
        <div className="min-w-0 flex-1">
          {headerHref ? (
            <Link href={headerHref} className={`block truncate text-sm font-semibold hover:underline ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
              {displayName}
            </Link>
          ) : (
            <p className={`truncate text-sm font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>{displayName}</p>
          )}
          {conversation.context_title && !isMotiionBrandedThread(conversation) ? (
            <p className={`truncate text-xs ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>
              {conversation.context_title}
            </p>
          ) : null}
        </div>
        {group ? (
          <div className="relative">
            <button
              type="button"
              aria-label="Chat options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`rounded-full px-2 py-1 text-lg leading-none ${isDashboard ? "text-white/70" : "text-[var(--ink)]"}`}
            >
              ···
            </button>
            {menuOpen ? (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-44 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 text-sm shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--ds-surface-raised)]"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowPeople(true);
                  }}
                >
                  View people in chat
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div ref={scrollRef} className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-4">
        {loading ? (
          <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>Loading messages…</p>
        ) : null}
        {!loading && !messages.length ? (
          <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>
            No messages yet. Say hello!
          </p>
        ) : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
          const isSystem = message.message_type === "system" || (!message.sender_id && message.message_type !== "attachment");
          return (
            <div key={message.id} className="space-y-3">
              {showDay ? (
                <p className="text-center text-[11px] font-medium tracking-wide text-[var(--ds-subtle)]">
                  {formatDayLabel(message.created_at)}
                </p>
              ) : null}
              {isSystem ? (
                <p className="px-6 text-center text-xs text-[var(--ds-muted)]">{message.body}</p>
              ) : (
                <MessageRow
                  message={message}
                  previous={previous}
                  currentUserId={currentUserId}
                  group={group}
                  variant={variant}
                  failed={failedId === message.id}
                  onRetry={() => handleSend(message.body ?? "")}
                />
              )}
            </div>
          );
        })}
      </div>

      {error ? <p className="px-4 pb-2 text-xs text-amber-500">{error}</p> : null}

      <footer className={`border-t px-4 py-3 ${isDashboard ? "border-white/8" : "border-[var(--line)]"}`}>
        {composerHidden ? (
          <p className={`py-2 text-center text-sm ${isDashboard ? "text-white/50" : "text-[var(--ds-muted)]"}`}>
            {composerNote}
          </p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              className={`min-h-[44px] flex-1 resize-none rounded-[var(--radius-field)] border px-3 py-2.5 text-sm outline-none ${
                isDashboard
                  ? "border-white/12 bg-white/4 text-white/90 placeholder:text-white/35 focus:border-white/30"
                  : "border-[#262626] bg-[#0a0a0a] text-[#eaeaea] placeholder:text-[#5a5a5a] focus:border-white/30 focus:outline-none"
              }`}
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className="rounded-full bg-[#fafafa] px-4 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#e6e6e6] disabled:opacity-40"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </footer>

      {showPeople ? (
        <ConversationParticipantsSheet conversationId={conversationId} onClose={() => setShowPeople(false)} />
      ) : null}
    </div>
  );
}

function MessageRow({
  message,
  previous,
  currentUserId,
  group,
  variant,
  failed,
  onRetry,
}: {
  message: ConversationMessage;
  previous: ConversationMessage | undefined;
  currentUserId: string;
  group: boolean;
  variant: "default" | "dashboard";
  failed: boolean;
  onRetry: () => void;
}) {
  const isMine = message.sender_id === currentUserId;
  const isDashboard = variant === "dashboard";
  const showSender =
    group && !isMine && message.sender_id && previous?.sender_id !== message.sender_id;
  const linkPayload =
    !message.deleted_at && message.message_type === "attachment"
      ? parseMessagingLinkPayload(message.body)
      : null;
  const attachmentPayload =
    !message.deleted_at && message.message_type === "attachment" && !linkPayload
      ? parseMessagingAttachmentPayload(message.body)
      : null;

  return (
    <div className={`flex min-w-0 gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {showSender ? (
        <PaneAvatar url={message.sender_avatar_url} name={message.sender_name || "?"} />
      ) : group && !isMine ? (
        <span className="size-9 shrink-0" />
      ) : null}
      <div className={`flex min-w-0 max-w-[min(75%,100%)] flex-col ${isMine ? "items-end" : "items-start"}`}>
        {showSender ? (
          <p className={`mb-1 text-[11px] font-medium ${isDashboard ? "text-white/55" : "text-[var(--ds-muted)]"}`}>
            {message.sender_name}
          </p>
        ) : null}
        {linkPayload ? (
          <MessageLinkBubble payload={linkPayload} isMine={isMine} variant={variant} />
        ) : attachmentPayload ? (
          <MessageAttachmentBubble payload={attachmentPayload} isMine={isMine} variant={variant} />
        ) : (
          <div
            className={`max-w-full min-w-0 overflow-hidden break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
              isMine
                ? "bg-[#fafafa] text-[#0a0a0a]"
                : isDashboard
                  ? "bg-white/8 text-white/88"
                  : "bg-[#1e1e1e] text-[#eaeaea]"
            }`}
          >
            {message.deleted_at ? (
              <em className="opacity-60">Message deleted</em>
            ) : message.message_type === "attachment" ? (
              <span className="opacity-80">Attachment unavailable</span>
            ) : (
              message.body
            )}
            <p className={`mt-1 text-[10px] ${isMine ? "text-black/50" : isDashboard ? "text-white/40" : "text-[var(--ink-soft)]"}`}>
              {formatTime(message.created_at)}
            </p>
          </div>
        )}
        {linkPayload || attachmentPayload ? (
          <p className={`mt-1 text-[10px] ${isMine ? "text-white/40" : isDashboard ? "text-white/40" : "text-[var(--ink-soft)]"}`}>
            {formatTime(message.created_at)}
          </p>
        ) : null}
        {failed ? (
          <button type="button" onClick={onRetry} className="mt-1 text-[11px] font-medium text-amber-500">
            Couldn&apos;t send. Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PaneAvatar({
  url,
  name,
  branded = false,
}: {
  url: string | null;
  name: string;
  branded?: boolean;
}) {
  if (branded) {
    return (
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LogoMotiion.svg" alt="" className="size-full object-contain p-1.5" />
      </div>
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-black/20">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0c2a26] text-xs font-semibold text-[#2dd4bf]">
      {initials || "?"}
    </div>
  );
}
