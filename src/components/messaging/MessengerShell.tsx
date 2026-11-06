"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Pin, Search, Trash2 } from "lucide-react";

import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { ConversationPane } from "@/components/messaging/ConversationPane";
import { RequestsPane } from "@/components/messaging/RequestsPane";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
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
import { BLOCKED_USERS_CHANGED_EVENT } from "@/lib/app/blocked-visibility-model";
import { INBOX_CHANGED_EVENT } from "@/lib/messaging/reliability";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type {
  HomePendingRequest,
  InboxConversation,
  MessageRequest,
} from "@/types/app";
import { ProductEmptyState } from "@/components/ui/EmptyState";

const EMPTY_PENDING: HomePendingRequest[] = [];
const EMPTY_REQUESTS: MessageRequest[] = [];

const PIN_STORAGE_KEY = "motiion:pinned-conversations";

function formatConversationPreview(body: string | null | undefined): string {
  const trimmed = body?.trim();
  if (!trimmed) return "No messages yet";
  const attachmentLabel = formatAttachmentPreviewLabel(trimmed);
  if (attachmentLabel) return attachmentLabel;
  return trimmed;
}

function readPinnedIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${PIN_STORAGE_KEY}:${userId}`);
    const values: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(values) ? values.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function MessengerShell(props: Parameters<typeof MessengerContents>[0]) {
  return <MessengerContents key={props.currentUserId} {...props} />;
}

function MessengerContents({
  conversations: incomingConversations,
  messageRequests: incomingMessageRequests = EMPTY_REQUESTS,
  currentUserId,
  error,
  variant = "default",
  layout = "card",
  initialConversationId,
  projectFilterTitle,
  pendingRequests: incomingPendingRequests = EMPTY_PENDING,
  pendingError = null,
  messageRequestsError = null,
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
  pendingError?: string | null;
  messageRequestsError?: string | null;
  initialFilter?: ChatInboxFilter;
}) {
  const router = useRouter();
  const [lastGood, setLastGood] = useState({ userId: currentUserId,
    conversations: incomingConversations, pendingRequests: incomingPendingRequests, messageRequests: incomingMessageRequests });
  const sameAccount = lastGood.userId === currentUserId;
  const conversations = error && sameAccount ? lastGood.conversations : incomingConversations;
  const pendingRequests = pendingError && sameAccount ? lastGood.pendingRequests : incomingPendingRequests;
  const messageRequests = messageRequestsError && sameAccount ? lastGood.messageRequests : incomingMessageRequests;
  if (lastGood.conversations !== conversations || lastGood.pendingRequests !== pendingRequests || lastGood.messageRequests !== messageRequests) {
    setLastGood({ userId: currentUserId, conversations, pendingRequests, messageRequests });
  }
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [query, setQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<ChatInboxFilter>(() => {
    const linked = incomingConversations.find((row) => row.conversation_id === initialConversationId);
    return linked ? filterForOpening(linked) : initialFilter;
  });
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
    // Hydrate account-scoped browser preferences after the matching server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinnedIds(readPinnedIds(currentUserId));
  }, [currentUserId]);

  const [previousInitial, setPreviousInitial] = useState({ conversation: initialConversationId, filter: initialFilter });
  if (previousInitial.conversation !== initialConversationId || previousInitial.filter !== initialFilter) {
    setPreviousInitial({ conversation: initialConversationId, filter: initialFilter });
    setActiveId(initialConversationId ?? null);
    const linked = conversations.find((row) => row.conversation_id === initialConversationId);
    setFilter(linked ? filterForOpening(linked) : initialFilter);
  }

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_requests" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_participants" },
        refresh,
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener(INBOX_CHANGED_EVENT, refresh);
    window.addEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener(INBOX_CHANGED_EVENT, refresh);
      window.removeEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, router]);

  const acceptedConversation = pendingOpenId ? conversationsWithInboxActivity(conversations).find((row) => row.conversation_id === pendingOpenId) : undefined;
  if (acceptedConversation) {
    setFilter(filterForOpening(acceptedConversation));
    setActiveId(acceptedConversation.conversation_id);
    setPendingOpenId(null);
  }

  const listed = useMemo(
    () =>
      conversationsWithInboxActivity(conversations).filter(
        (row) => !removedIds.includes(row.conversation_id),
      ),
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
      rows = rows.filter((row) =>
        row.context_title?.toLowerCase().includes(needle),
      );
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
      requests: requestsChipCount(
        pendingRequests.length,
        messageRequests.length,
      ),
    }),
    [listed, messageRequests.length, pendingRequests.length],
  );

  const active =
    filtered.find((row) => row.conversation_id === activeId) ??
    listed.find((row) => row.conversation_id === activeId) ??
    null;

  function openConversation(id: string | null, partition?: ChatInboxFilter) {
    setActiveId(id);
    const row = conversations.find((item) => item.conversation_id === id);
    if (partition) setFilter(partition);
    else if (row) setFilter(filterForOpening(row));
    const url = new URL(window.location.href);
    if (partition) url.searchParams.set("filter", partition);
    if (id) url.searchParams.set("conversation", id);
    else url.searchParams.delete("conversation");
    window.history.pushState(null, "", url);
  }
  useEffect(() => {
    const onBack = () => {
      const id = new URLSearchParams(window.location.search).get("conversation");
      setActiveId(id);
      const row = conversations.find((item) => item.conversation_id === id);
      if (row) setFilter(filterForOpening(row));
      else {
        const filter = new URLSearchParams(window.location.search).get("filter");
        setFilter(filter === "requests" || filter === "general" ? filter : "primary");
      }
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [conversations]);

  function togglePin(conversationId: string) {
    setPinnedIds((current) => {
      const next = current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [conversationId, ...current];
      try { window.localStorage.setItem(`${PIN_STORAGE_KEY}:${currentUserId}`, JSON.stringify(next)); } catch { /* Pin still works for this visit. */ }
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

  async function runSelectionAction(
    action: "read" | "unread" | "archive",
    ids: string[],
  ) {
    if (!ids.length || busy) return;
    setBusy(true);
    setActionError(null);
    try {
    const result =
      action === "read"
        ? await markConversationsRead(ids)
        : action === "unread"
          ? await markConversationsUnread(ids)
          : await archiveConversations(ids);
    if (!result.ok) {
      setActionError(result.error ?? "Could not update those conversations.");
      return;
    }
    if (action === "archive") {
      setRemovedIds((current) => [...current, ...ids]);
      if (activeId && ids.includes(activeId)) openConversation(null);
    }
    exitEditing();
    router.refresh();
    } catch { setActionError("Could not confirm those changes. Check your connection and retry."); }
    finally { setBusy(false); }
  }

  function openAcceptedConversation(conversationId: string) {
    const row = listed.find((item) => item.conversation_id === conversationId);
    setPendingOpenId(conversationId);
    setFilter(row ? filterForOpening(row) : "primary");
    openConversation(conversationId);
    exitEditing();
  }


  const mutedText = "text-[var(--ui-muted)]";

  return (
    <div
      className={
        isWorkspace
          ? "buyer-messages-workspace flex h-full min-h-0 flex-1 flex-col"
          : "inbox-page"
      }
    >
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
              <button
                type="button"
                className="inbox-page__edit"
                onClick={() => (editing ? exitEditing() : setEditing(true))}
              >
                {editing ? (
                  <Check className="size-3.5" />
                ) : (
                  <Pencil className="size-3.5" />
                )}
                {editing ? "Done" : "Edit"}
              </button>
            )
          }
        />
      ) : (
        <header className="inbox-page__header">
          <h1>Inbox</h1>
          {filter === "requests" ? null : (
            <button
              type="button"
              className="inbox-page__edit"
              onClick={() => (editing ? exitEditing() : setEditing(true))}
            >
              {editing ? (
                <Check className="size-3.5" />
              ) : (
                <Pencil className="size-3.5" />
              )}
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
                openConversation(null, id);
              }}
              aria-pressed={filter === id}
            >
              {label}
              {count > 0 ? (
                <span className="opportunities-count">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error || pendingError || messageRequestsError ? (
        <div role="status" className="mx-3 mb-3 rounded-xl border border-[var(--ui-warning)] bg-[var(--ui-warning-soft)] text-[var(--ui-warning)] p-3 text-sm">
          <p>{error ? "Conversations couldn't be refreshed." : "Some requests couldn't be refreshed."} Previously loaded items are still available.</p>
          <button type="button" className="mt-1 underline underline-offset-4" onClick={() => router.refresh()}>Retry inbox</button>
        </div>
      ) : null}
      {actionError ? (
        <p className="text-sm text-[var(--ui-danger)]">{actionError}</p>
      ) : null}

      {!isWorkspace && projectFilterTitle ? (
        <p className={`text-sm ${mutedText}`}>
          Showing conversations related to{" "}
          <span className="font-medium text-[var(--ui-text)]">
            {projectFilterTitle}
          </span>
        </p>
      ) : null}

      {filter === "requests" ? (
        <RequestsPane
          pendingRequests={pendingRequests}
          messageRequests={messageRequests}
          loadFailed={Boolean(pendingError || messageRequestsError)}
          variant={variant}
          onAccepted={openAcceptedConversation}
        />
      ) : (
        <div
          key={filter}
          className={`messenger-list ui-swap min-h-0 overflow-hidden ${
            isWorkspace
              ? "h-full flex-1"
              : `rounded-2xl border ${
                  isDashboard
                    ? "h-[70vh] min-h-[420px] border-[var(--ui-border)] bg-[var(--ui-surface-soft)]"
                    : "inbox-page__panes border-[var(--ui-border)] bg-[var(--ui-surface)]"
                }`
          }`}
        >
          <aside
            className={`flex min-h-0 flex-col border-r md:flex ${
              "border-[var(--ui-border)]"
            } flex`}
          >
            <div
              className={`border-b p-3 ${"border-[var(--ui-border)]"}`}
            >
              <label
                className="inbox-search"
              >
                <Search aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search conversations"
                  aria-label="Search conversations"
                  className="workspace-bare-input"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!filtered.length ? (
                error ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--ui-muted)]">Your conversations are unavailable. Retry above.</p>
                ) : query.trim() ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--ui-muted)]">No conversations match your search.</p>
                ) : (
                  <div className="messenger-list__empty">
                    <ProductEmptyState
                      compact
                      illustration="inbox"
                      title={filter === "primary" ? "No conversations yet" : "No messages from talent yet"}
                      description={filter === "primary"
                        ? "Activity and industry conversations will show up here."
                        : "Messages from other talent will show up here."}
                    />
                  </div>
                )
              ) : (
                <ul>
                  {filtered.map((row) => {
                    const isActive = row.conversation_id === activeId;
                    const isPinned = pinnedIds.includes(row.conversation_id);
                    const isSelected = selectedIds.includes(
                      row.conversation_id,
                    );
                    const name = inboxDisplayName(row);
                    return (
                      <li key={row.conversation_id} data-active={isActive}>
                        <div className="flex items-stretch">
                          {editing ? (
                            <label className="flex items-center px-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleSelected(row.conversation_id)
                                }
                                aria-label={`Select ${name}`}
                              />
                            </label>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              editing
                                ? toggleSelected(row.conversation_id)
                                : openConversation(row.conversation_id)
                            }
                            className={`studio-conversation-row flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition ${
                              isActive
                                ? "bg-[var(--ui-surface-soft)]"
                                : isDashboard
                                  ? "hover:bg-[var(--ui-surface-soft)]"
                                  : "hover:bg-[var(--ui-surface-soft)]/70"
                            }`}
                          >
                            <ListAvatar
                              url={
                                isMotiionBrandedThread(row)
                                  ? null
                                  : row.participant_avatar_url
                              }
                              name={name}
                              branded={isMotiionBrandedThread(row)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span
                                  className={`truncate text-sm font-semibold ${"text-[var(--ui-text)]"}`}
                                >
                                  {name}
                                </span>
                                <span
                                  className={`shrink-0 text-[11px] ${"text-[var(--ui-muted)]"}`}
                                >
                                  {formatInboxTimestamp(row.last_message_at)}
                                </span>
                              </span>
                              {row.context_title &&
                              !isMotiionBrandedThread(row) ? (
                                <span className="studio-conversation-context mt-0.5 block truncate text-[11px] text-[var(--ui-accent)]/80">
                                  {row.context_title}
                                </span>
                              ) : null}
                              <span
                                className={`studio-conversation-preview mt-0.5 line-clamp-1 block text-xs ${"text-[var(--ui-muted)]"}`}
                              >
                                {formatConversationPreview(
                                  row.last_message_body,
                                )}
                              </span>
                            </span>
                            {row.unread_count > 0 ? (
                              <span
                                className="mt-2 size-2 shrink-0 rounded-full bg-[var(--ui-accent)]"
                                aria-label={`${row.unread_count} unread`}
                              />
                            ) : null}
                          </button>
                          {!editing ? (
                            <button
                              type="button"
                              onClick={() => togglePin(row.conversation_id)}
                              className={`px-2 text-[var(--ui-muted)] hover:text-[var(--ui-accent)] ${isPinned ? "text-[var(--ui-accent)]" : ""}`}
                              aria-label={
                                isPinned
                                  ? "Unpin conversation"
                                  : "Pin conversation"
                              }
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
              <div
                className={`flex flex-wrap items-center gap-2 border-t px-3 py-2 ${"border-[var(--ui-border)]"}`}
              >
                <EditAction
                  label="Read all"
                  disabled={busy || !filtered.length}
                  onClick={() =>
                    void runSelectionAction(
                      "read",
                      filtered.map((row) => row.conversation_id),
                    )
                  }
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
        </div>
      )}

      <WorkspaceSidePanel
        id="inbox-thread-panel"
        title="Messages"
        open={Boolean(active)}
        persistent
        onClose={() => openConversation(null)}
      >
        {active ? (
          <div className="inbox-thread-content flex h-full min-h-0 flex-col">
            <button
              type="button"
              onClick={() => openConversation(null)}
              className={`flex items-center gap-1.5 px-4 pt-3 text-xs font-medium md:hidden ${mutedText}`}
            >
              <ArrowLeft className="size-3.5" /> All conversations
            </button>
            <ConversationPane
              key={`${currentUserId}:${active.conversation_id}`}
              conversation={active}
              onBlocked={() => { setRemovedIds(ids => [...ids, active.conversation_id]); openConversation(null); router.refresh(); }}
              currentUserId={currentUserId}
              variant="default"
            />
          </div>
        ) : (
          <div className="inbox-thread-content inbox-thread-content--empty flex h-full items-center justify-center p-8 text-center">
            <ProductEmptyState
              compact
              illustration="inbox"
              title="Pick up a conversation"
              description="Select a conversation to read and reply."
            />
          </div>
        )}
      </WorkspaceSidePanel>

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversations-title"
            className="w-full max-w-sm rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]"
          >
            <h2
              id="delete-conversations-title"
              className="text-base font-semibold"
            >
              Delete Conversations
            </h2>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">
              This removes the selected conversations from your inbox. The other
              people can still see their copy.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-3.5 py-1.5 text-sm text-[var(--ui-muted)]"
              >
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
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full px-2 py-1 text-xs font-medium text-[var(--ui-muted)] disabled:opacity-40"
    >
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
        <img
          src="/LogoMotiion.svg"
          alt=""
          className="size-full object-contain p-1.5"
        />
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
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ui-accent)_18%,black)] text-xs font-semibold text-[var(--ui-accent)]">
      {initials || "?"}
    </span>
  );
}
