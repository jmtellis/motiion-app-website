"use client";

import { ReportContentDialog } from "@/components/settings/ReportContentDialog";
import { blockUser } from "@/app/settings/moderation-actions";
import { BLOCKED_USERS_CHANGED_EVENT } from "@/lib/app/blocked-visibility-model";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
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
import { conversationDraftKey, mergeConversationMessages, notifyInboxChanged } from "@/lib/messaging/reliability";
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
  onBlocked,
}: {
  conversation: InboxConversation;
  currentUserId: string;
  variant?: "default" | "dashboard";
  onBlocked?: () => void;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => drafts.get(conversationDraftKey(currentUserId, conversation.conversation_id)) ?? "");
  const [failedId, setFailedId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const blockPending = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [readOnlyNote, setReadOnlyNote] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const alive = useRef(true);
  const sending = useRef(false);
  const pendingIds = useRef(new Set<string>());
  const keepAtBottom = useRef(true);
  const draftKey = conversationDraftKey(currentUserId, conversation.conversation_id);
  const conversationId = conversation.conversation_id;
  const displayName = inboxDisplayName(conversation);
  const group = isGroupThread(conversation);
  const oneWay = isOneWayMotiionThread(conversation);
  const profileHref = conversation.participant_user_id ? `/profile/${conversation.participant_user_id}` : null;
  const headerHref = profileHref ?? activityHref(conversation);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); menuRef.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  const loadMessages = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fetchConversationMessages(conversationId);
      if (!alive.current || id !== requestId.current) return;
      if (result.error) setError("Couldn't refresh messages. Your conversation is still here. Try again.");
      else {
        setError(null);
        setMessages((current) => mergeConversationMessages(current, result.messages, pendingIds.current));
      }
    } catch {
      if (alive.current && id === requestId.current) setError("Couldn't load messages. Check your connection and retry.");
    } finally {
      if (alive.current && id === requestId.current) setLoading(false);
    }
  }, [conversationId]);

  const markRead = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    await markConversationRead(conversationId);
    if (alive.current) notifyInboxChanged();
  }, [conversationId]);

  useEffect(() => {
    alive.current = true;
    // This effect starts external I/O; message state changes only after its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages();
    void markRead();
    const refresh = () => {
      if (document.visibilityState === "visible") { void loadMessages(); void markRead(); }
    };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive.current = false;
      requestId.current += 1;
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadMessages, markRead]);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void loadMessages();
          void markRead();
        },
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") void loadMessages(); });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, markRead]);

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
    if (keepAtBottom.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function updateDraft(value: string) {
    setDraft(value);
    if (value.trim()) drafts.set(draftKey, value);
    else drafts.delete(draftKey);
  }

  function handleSend(retryBody?: string) {
    const body = (retryBody ?? draft).trim();
    if (!body || sending.current || (failedId && !retryBody) || oneWay || pendingRequest || readOnlyNote) return;

    sending.current = true;
    keepAtBottom.current = true;
    requestId.current += 1;
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

    if (failedId) pendingIds.current.delete(failedId);
    pendingIds.current.add(optimisticId);
    setMessages((current) => [...current.filter((message) => message.id !== failedId), optimistic]);
    setFailedId(null);
    if (!retryBody) updateDraft("");
    setError(null);

    setIsSending(true);
    void sendConversationMessage(conversationId, body)
      .then(async (result) => {
        if (!alive.current) return;
        if (!result.ok) {
          setFailedId(optimisticId);
          setError(result.error ?? "Could not send message.");
          return;
        }
        pendingIds.current.delete(optimisticId);
        if (result.messageId) {
          setMessages((current) => current.map((message) => message.id === optimisticId ? { ...message, id: result.messageId! } : message));
        }
        notifyInboxChanged();
        await loadMessages();
      })
      .catch(() => {
        if (!alive.current) return;
        setFailedId(optimisticId);
        setError("Message wasn't confirmed. Check your connection before retrying.");
      })
      .finally(() => { sending.current = false; if (alive.current) setIsSending(false); });
  }

  async function confirmBlockPerson() {
    if (!conversation.participant_user_id || blockPending.current) return;
    blockPending.current = true; setBlocking(true); setBlockError(null);
    try {
      const result = await blockUser(conversation.participant_user_id);
      if (!alive.current) return;
      if (!result.ok) { setBlockError(result.error); return; }
      setConfirmBlock(false); setBlocked(true);
      window.dispatchEvent(new Event(BLOCKED_USERS_CHANGED_EVENT));
      notifyInboxChanged(); onBlocked?.();
    } catch { if (alive.current) setBlockError("Could not confirm the block. Please retry."); }
    finally { blockPending.current = false; if (alive.current) setBlocking(false); }
  }
  if (blocked) return <div className="p-6 text-[var(--ui-text)]"><p role="status">This person is blocked.</p><p className="mt-2 text-sm text-[var(--ui-muted)]">You can manage blocked users in Settings.</p><Link href="/settings" className="mt-4 inline-block underline">Open Settings</Link></div>;

  const composerHidden = oneWay || pendingRequest || Boolean(readOnlyNote);
  const composerNote = oneWay
    ? "Messages from Motiion aren't replies."
    : pendingRequest
      ? "Message request sent — waiting for acceptance."
      : readOnlyNote;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${"border-[var(--ui-border)]"}`}>
        <PaneAvatar
          url={isMotiionBrandedThread(conversation) ? null : conversation.participant_avatar_url}
          name={displayName}
          branded={isMotiionBrandedThread(conversation)}
        />
        <div className="min-w-0 flex-1">
          {headerHref ? (
            <Link href={headerHref} className={`block truncate text-sm font-semibold hover:underline ${"text-[var(--ui-text)]"}`}>
              {displayName}
            </Link>
          ) : (
            <p className={`truncate text-sm font-semibold ${"text-[var(--ui-text)]"}`}>{displayName}</p>
          )}
          {conversation.context_title && !isMotiionBrandedThread(conversation) ? (
            <p className={`truncate text-xs ${"text-[var(--ui-muted)]"}`}>
              {conversation.context_title}
            </p>
          ) : null}
        </div>
        {group || (conversation.participant_user_id && !oneWay && !isMotiionBrandedThread(conversation)) ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Chat options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`rounded-full px-2 py-1 text-lg leading-none ${"text-[var(--ui-text)]"}`}
            >
              ···
            </button>
            {menuOpen ? (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-44 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1 text-sm shadow-lg">
                {group ? <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--ui-surface-soft)]"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowPeople(true);
                  }}
                >
                  View people in chat
                </button> : <button type="button" className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-[var(--ui-danger)] hover:bg-[var(--ui-surface-soft)]" onClick={() => { setMenuOpen(false); setBlockError(null); setConfirmBlock(true); }}>Block person</button>}
                {conversation.participant_user_id && !isMotiionBrandedThread(conversation) ? <button type="button" className="block min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--ui-surface-soft)]" onClick={() => { setMenuOpen(false); setReportOpen(true); }}>Report conversation</button> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div ref={scrollRef} onScroll={(event) => { const el = event.currentTarget; keepAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96; }} className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-4">
        {loading ? (
          <p className={`text-sm ${"text-[var(--ui-muted)]"}`}>Loading messages…</p>
        ) : null}
        {!loading && !messages.length && !error ? (
          <p className={`text-sm ${"text-[var(--ui-muted)]"}`}>
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
                <p className="text-center text-[11px] font-medium tracking-wide text-[var(--ui-muted)]">
                  {formatDayLabel(message.created_at)}
                </p>
              ) : null}
              {isSystem ? (
                <p className="px-6 text-center text-xs text-[var(--ui-muted)]">{message.body}</p>
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

      {error ? <p role="alert" className="px-4 pb-2 text-sm text-[var(--ui-danger)]">{error} {!failedId ? <button type="button" className="underline" onClick={() => void loadMessages()}>Retry</button> : <button type="button" className="underline" onClick={() => {
        pendingIds.current.delete(failedId);
        setMessages((current) => current.filter((message) => message.id !== failedId));
        setFailedId(null);
        setError(null);
      }}>Discard failed message</button>}</p> : null}

      <footer className={`border-t px-4 py-3 ${"border-[var(--ui-border)]"}`}>
        {composerHidden ? (
          <p className={`py-2 text-center text-sm ${"text-[var(--ui-muted)]"}`}>
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
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              aria-label="Message"
              maxLength={10000}
              className="min-h-[44px] flex-1 resize-none rounded-[var(--ui-radius-control)] border border-[var(--ui-control-border)] bg-[var(--ui-surface)] px-3 py-2.5 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim() || Boolean(failedId)}
              className="ui-button"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </footer>

      {conversation.participant_user_id ? <ReportContentDialog open={reportOpen} target={{ contentType: "conversation", contentId: conversationId, reportedUserId: conversation.participant_user_id, displayName: "conversation" }} onClose={() => setReportOpen(false)} /> : null}
      <Modal open={confirmBlock} alert title={`Block ${displayName}?`} onClose={() => { if (!blockPending.current) setConfirmBlock(false); }} size="sm" footer={<div className="flex justify-end gap-2"><button type="button" className="ui-button ui-button--secondary" disabled={blocking} onClick={() => setConfirmBlock(false)}>Cancel</button><button type="button" className="ui-button ui-button--danger" disabled={blocking} onClick={() => void confirmBlockPerson()}>{blocking ? "Blocking…" : "Block person"}</button></div>}><p className="text-sm text-[var(--ui-muted)]">Their conversation and profile will be hidden from your inbox and discovery. You can unblock them in Settings.</p>{blockError ? <p role="alert" className="mt-3 text-sm text-[var(--ui-danger)]">{blockError}</p> : null}</Modal>
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
          <p className={`mb-1 text-[11px] font-medium ${"text-[var(--ui-muted)]"}`}>
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
                ? "bg-[var(--ui-accent)] text-[var(--ui-on-accent)]"
                : "bg-[var(--ui-surface-soft)] text-[var(--ui-text)]"
            }`}
          >
            {message.deleted_at ? (
              <em className="opacity-60">Message deleted</em>
            ) : message.message_type === "attachment" ? (
              <span className="opacity-80">Attachment unavailable</span>
            ) : (
              message.body
            )}
            <p className={`mt-1 text-[10px] ${isMine ? "text-[var(--ui-on-accent)]/80" : "text-[var(--ui-muted)]"}`}>
              {formatTime(message.created_at)}
            </p>
          </div>
        )}
        {linkPayload || attachmentPayload ? (
          <p className={`mt-1 text-[10px] ${"text-[var(--ui-muted)]"}`}>
            {formatTime(message.created_at)}
          </p>
        ) : null}
        {failed ? (
          <button type="button" onClick={onRetry} className="mt-1 text-[11px] font-medium text-[var(--ui-danger)]">
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
