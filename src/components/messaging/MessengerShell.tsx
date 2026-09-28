"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Pin, Search, Trash2 } from "lucide-react";

import { ConversationPane } from "@/components/messaging/ConversationPane";
import { RequestsPane } from "@/components/messaging/RequestsPane";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { InboxEmptyState } from "@/components/messaging/InboxEmptyState";
import { formatAttachmentPreviewLabel } from "@/lib/messaging/attachment-payload";
import {
  archiveConversations,
  markConversationsRead,
  markConversationsUnread,
} from "@/lib/app/conversations";
import {
  conversationsWithInboxActivity,
  filterConversationsByPartition,
  filterForOpening,
  formatInboxTimestamp,
  inboxDisplayName,
  isMotiionBrandedThread,
  partitionUnreadCount,
  requestsChipCount,
  type ChatInboxFilter,
} from "@/lib/messaging/inbox-partition";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { HomePendingRequest, InboxConversation, MessageRequest } from "@/types/app";

const PIN_STORAGE_KEY = "motiion:pinned-conversations";

function formatConversationPreview(body: string | null | undefined): string {
  const trimmed = body?.trim();
  if (!trimmed) return "No messages yet";
  const attachmentLabel = formatAttachmentPreviewLabel(trimmed);
  if (attachmentLabel) return attachmentLabel;
  return trimmed;
}

function readPinnedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function MessengerShell({
  conversations,
  messageRequests = [],
  currentUserId,
  error,
  variant = "default",
  layout = "card",
  initialConversationId,
  projectFilterTitle,
  pendingRequests = [],
  initialFilter = "primary",
}: {
  conversations: InboxConversation[];
  messageRequests?: MessageRequest[];
  currentUserId: string;
  error: string | null;
  variant?: "default" | "dashboard";
  layout?: "card" | "workspace";
  initialConversationId?: string | null;
  projectFilterTitle?: string | null;
  pendingRequests?: HomePendingRequest[];
  initialFilter?: ChatInboxFilter;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [query, setQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<ChatInboxFilter>(initialFilter);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const isDashboard = variant === "dashboard";
  const isWorkspace = layout === "workspace";

  useEffect(() => {
    setPinnedIds(readPinnedIds());
  }, []);

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel(`inbox-${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, refresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, router]);

  useEffect(() => {
    if (!pendingOpenId) return;
    const row = conversationsWithInboxActivity(conversations).find(
      (item) => item.conversation_id === pendingOpenId,
    );
    if (!row) return;
    setFilter(filterForOpening(row));
    setActiveId(row.conversation_id);
    setPendingOpenId(null);
  }, [conversations, pendingOpenId]);

  const listed = useMemo(
    () => conversationsWithInboxActivity(conversations).filter((row) => !removedIds.includes(row.conversation_id)),
    [conversations, removedIds],
  );

  const partitioned = useMemo(() => {
    if (filter === "requests") return [] as InboxConversation[];
    return filterConversationsByPartition(listed, filter);
  }, [filter, listed]);

  const filtered = useMemo(() => {
    let rows = partitioned;
    if (projectFilterTitle?.trim()) {
      const needle = projectFilterTitle.trim().toLowerCase();
      rows = rows.filter((row) => row.context_title?.toLowerCase().includes(needle));
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          inboxDisplayName(row).toLowerCase().includes(needle) ||
          row.last_message_body?.toLowerCase().includes(needle) ||
          row.context_title?.toLowerCase().includes(needle),
      );
    }
    return [...rows].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.conversation_id);
      const bPinned = pinnedIds.includes(b.conversation_id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "");
    });
  }, [partitioned, pinnedIds, projectFilterTitle, query]);

  const filterCounts = useMemo(
    () => ({
      primary: partitionUnreadCount(listed, "primary"),
      general: partitionUnreadCount(listed, "general"),
      requests: requestsChipCount(pendingRequests.length, messageRequests.length),
    }),
    [listed, messageRequests.length, pendingRequests.length],
  );

  const active =
    filtered.find((row) => row.conversation_id === activeId) ??
    listed.find((row) => row.conversation_id === activeId) ??
    null;

  function togglePin(conversationId: string) {
    setPinnedIds((current) => {
      const next = current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [conversationId, ...current];
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleSelected(conversationId: string) {
    setSelectedIds((current) =>
      current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [...current, conversationId],
    );
  }

  function exitEditing() {
    setEditing(false);
    setSelectedIds([]);
    setConfirmDelete(false);
  }

  async function runSelectionAction(action: "read" | "unread" | "archive", ids: string[]) {
    if (!ids.length || busy) return;
    setBusy(true);
    setActionError(null);
    const result =
      action === "read"
        ? await markConversationsRead(ids)
        : action === "unread"
          ? await markConversationsUnread(ids)
          : await archiveConversations(ids);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error ?? "Could not update those conversations.");
      return;
    }
    if (action === "archive") {
      setRemovedIds((current) => [...current, ...ids]);
      if (activeId && ids.includes(activeId)) setActiveId(null);
    }
    exitEditing();
    router.refresh();
  }

  function openAcceptedConversation(conversationId: string) {
    const row = listed.find((item) => item.conversation_id === conversationId);
    setPendingOpenId(conversationId);
    setFilter(row ? filterForOpening(row) : "primary");
    setActiveId(conversationId);
    exitEditing();
  }

  if (error) {
    return (
      <p
        className={`rounded-xl border px-4 py-3 text-sm ${
          isDashboard
            ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        Could not load conversations: {error}
      </p>
    );
  }

  const mutedText = isDashboard ? "text-white/55" : "text-[var(--ds-muted)]";

  return (
    <div className={isWorkspace ? "buyer-messages-workspace flex h-full min-h-0 flex-1 flex-col" : "inbox-page"}>
      {isDashboard ? (
        <IndustryPageHeader
          title="Inbox"
          description={
            projectFilterTitle
              ? `Conversations for ${projectFilterTitle}`
              : "The conversation behind every great collaboration."
          }
          actions={
            filter === "requests" ? null : (
              <button type="button" className="inbox-page__edit" onClick={() => (editing ? exitEditing() : setEditing(true))}>
                {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                {editing ? "Done" : "Edit"}
              </button>
            )
          }
        />
      ) : (
        <header className="inbox-page__header">
          <h1>Inbox</h1>
          {filter === "requests" ? null : (
            <button type="button" className="inbox-page__edit" onClick={() => (editing ? exitEditing() : setEditing(true))}>
              {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </header>
      )}
      <div className="home-browser__filters" role="group" aria-label="Inbox">
        {(
          [
            ["primary", "Primary"],
            ["general", "General"],
            ["requests", "Requests"],
          ] as const
        ).map(([id, label]) => {
          const count = filterCounts[id];
          return (
            <button
              key={id}
              type="button"
              disabled={editing}
              onClick={() => {
                setFilter(id);
                setActiveId(null);
              }}
              aria-pressed={filter === id}
            >
              {label}
              {count > 0 ? (
                <span className="opportunities-count">{count > 99 ? "99+" : count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {actionError ? <p className="text-sm text-amber-500">{actionError}</p> : null}

      {!isWorkspace && projectFilterTitle ? (
        <p className={`text-sm ${mutedText}`}>
          Showing conversations related to{" "}
          <span className="font-medium text-[var(--ds-on-surface)]">{projectFilterTitle}</span>
        </p>
      ) : null}

      {filter === "requests" ? (
        <RequestsPane
          pendingRequests={pendingRequests}
          messageRequests={messageRequests}
          variant={variant}
          onAccepted={openAcceptedConversation}
        />
      ) : isDashboard && !listed.length && !query.trim() ? (
        <InboxEmptyState hideHeader />
      ) : (
        <div
          key={filter}
          className={`ui-swap grid min-h-0 overflow-hidden md:grid-cols-[minmax(240px,1fr)_2fr] ${
            isWorkspace
              ? "h-full flex-1"
              : `rounded-2xl border ${
                  isDashboard
                    ? "h-[70vh] min-h-[420px] border-white/8 bg-white/2"
                    : "inbox-page__panes border-[var(--ds-border)] bg-[var(--ds-surface)]"
                }`
          }`}
        >
          <aside
            className={`flex min-h-0 flex-col border-r md:flex ${
              isDashboard ? "border-white/8" : "border-[var(--ds-border)]"
            } ${active ? "hidden md:flex" : "flex"}`}
          >
            <div className={`border-b p-3 ${isDashboard ? "border-white/8" : "border-[var(--ds-border)]"}`}>
              <label className={`inbox-search${isDashboard ? " inbox-search--dark" : ""}`}>
                <Search aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search conversations"
                  className="workspace-bare-input"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!filtered.length ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--ds-muted)]">
                  {filter === "primary"
                    ? "Activity and industry conversations will show up here."
                    : "Messages from other talent will show up here."}
                </p>
              ) : (
                <ul>
                  {filtered.map((row) => {
                    const isActive = row.conversation_id === activeId;
                    const isPinned = pinnedIds.includes(row.conversation_id);
                    const isSelected = selectedIds.includes(row.conversation_id);
                    const name = inboxDisplayName(row);
                    return (
                      <li key={row.conversation_id} data-active={isActive}>
                        <div className="flex items-stretch">
                          {editing ? (
                            <label className="flex items-center px-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(row.conversation_id)}
                                aria-label={`Select ${name}`}
                              />
                            </label>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              editing ? toggleSelected(row.conversation_id) : setActiveId(row.conversation_id)
                            }
                            className={`studio-conversation-row flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition ${
                              isActive
                                ? isDashboard
                                  ? "bg-white/8"
                                  : "bg-[var(--ds-surface-raised)]"
                                : isDashboard
                                  ? "hover:bg-white/4"
                                  : "hover:bg-[var(--ds-surface-raised)]/70"
                            }`}
                          >
                            <ListAvatar
                              url={isMotiionBrandedThread(row) ? null : row.participant_avatar_url}
                              name={name}
                              branded={isMotiionBrandedThread(row)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className={`truncate text-sm font-semibold ${isDashboard ? "text-white/90" : "text-[var(--ds-text-default)]"}`}>
                                  {name}
                                </span>
                                <span className={`shrink-0 text-[11px] ${isDashboard ? "text-white/40" : "text-[var(--ds-subtle)]"}`}>
                                  {formatInboxTimestamp(row.last_message_at)}
                                </span>
                              </span>
                              {row.context_title && !isMotiionBrandedThread(row) ? (
                                <span className="studio-conversation-context mt-0.5 block truncate text-[11px] text-[var(--ds-accent)]/80">
                                  {row.context_title}
                                </span>
                              ) : null}
                              <span className={`studio-conversation-preview mt-0.5 line-clamp-1 block text-xs ${isDashboard ? "text-white/50" : "text-[var(--ds-muted)]"}`}>
                                {formatConversationPreview(row.last_message_body)}
                              </span>
                            </span>
                            {row.unread_count > 0 ? (
                              <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--ds-accent)]" aria-label={`${row.unread_count} unread`} />
                            ) : null}
                          </button>
                          {!editing ? (
                            <button
                              type="button"
                              onClick={() => togglePin(row.conversation_id)}
                              className={`px-2 text-white/30 hover:text-[var(--ds-accent)] ${isPinned ? "text-[var(--ds-accent)]" : ""}`}
                              aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
                            >
                              <Pin className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {editing ? (
              <div className={`flex flex-wrap items-center gap-2 border-t px-3 py-2 ${isDashboard ? "border-white/8" : "border-[var(--ds-border)]"}`}>
                <EditAction
                  label="Read all"
                  disabled={busy || !filtered.length}
                  onClick={() => void runSelectionAction("read", filtered.map((row) => row.conversation_id))}
                />
                <EditAction
                  label="Read"
                  disabled={busy || !selectedIds.length}
                  onClick={() => void runSelectionAction("read", selectedIds)}
                />
                <EditAction
                  label="Unread"
                  disabled={busy || !selectedIds.length}
                  onClick={() => void runSelectionAction("unread", selectedIds)}
                />
                <button
                  type="button"
                  disabled={busy || !selectedIds.length}
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            ) : null}
          </aside>

          <section className={`min-h-0 ${active ? "block" : "hidden md:block"}`}>
            {active ? (
              <div className="flex h-full min-h-0 flex-col">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className={`flex items-center gap-1.5 px-4 pt-3 text-xs font-medium md:hidden ${mutedText}`}
                >
                  <ArrowLeft className="size-3.5" /> All conversations
                </button>
                <ConversationPane
                  key={active.conversation_id}
                  conversation={active}
                  currentUserId={currentUserId}
                  variant={variant}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[var(--ds-subtle)]"}`}>
                  Select a conversation to read and reply.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-conversations-title" className="w-full max-w-sm rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 text-[var(--ds-text-default)]">
            <h2 id="delete-conversations-title" className="text-base font-semibold">Delete Conversations</h2>
            <p className="mt-2 text-sm text-[var(--ds-muted)]">
              This removes the selected conversations from your inbox. The other people can still see their copy.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full px-3.5 py-1.5 text-sm text-[var(--ds-muted)]">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runSelectionAction("archive", selectedIds)}
                className="rounded-full bg-[#fafafa] px-3.5 py-1.5 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="rounded-full px-2 py-1 text-xs font-medium text-[var(--ds-muted)] disabled:opacity-40">
      {label}
    </button>
  );
}

function ListAvatar({
  url,
  name,
  branded,
}: {
  url: string | null;
  name: string;
  branded?: boolean;
}) {
  if (branded) {
    return (
      <span className="relative block size-10 shrink-0 overflow-hidden rounded-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LogoMotiion.svg" alt="" className="size-full object-contain p-1.5" />
      </span>
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
      <span className="relative block size-10 shrink-0 overflow-hidden rounded-full bg-black/20">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ds-accent)_18%,black)] text-xs font-semibold text-[var(--ds-accent)]">
      {initials || "?"}
    </span>
  );
}
