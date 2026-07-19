"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pin, Search } from "lucide-react";

import { ConversationPane } from "@/components/messaging/ConversationPane";
import { formatAttachmentPreviewLabel } from "@/lib/messaging/attachment-payload";
import type { InboxConversation } from "@/types/app";

const PIN_STORAGE_KEY = "motiion:pinned-conversations";

function formatConversationPreview(body: string | null | undefined): string {
  const trimmed = body?.trim();
  if (!trimmed) return "No messages yet";
  const attachmentLabel = formatAttachmentPreviewLabel(trimmed);
  if (attachmentLabel) return attachmentLabel;
  return trimmed;
}

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  currentUserId,
  error,
  variant = "default",
  layout = "card",
  initialConversationId,
  projectFilterTitle,
}: {
  conversations: InboxConversation[];
  currentUserId: string;
  error: string | null;
  variant?: "default" | "dashboard";
  layout?: "card" | "workspace";
  initialConversationId?: string | null;
  projectFilterTitle?: string | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [query, setQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const isDashboard = variant === "dashboard";
  const isWorkspace = layout === "workspace";

  useEffect(() => {
    setPinnedIds(readPinnedIds());
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      setActiveId(initialConversationId);
    }
  }, [initialConversationId]);

  const filtered = useMemo(() => {
    let rows = conversations;
    if (projectFilterTitle?.trim()) {
      const needle = projectFilterTitle.trim().toLowerCase();
      rows = rows.filter((row) => row.context_title?.toLowerCase().includes(needle));
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.participant_name.toLowerCase().includes(needle) ||
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
  }, [conversations, pinnedIds, projectFilterTitle, query]);

  const active = filtered.find((row) => row.conversation_id === activeId) ?? conversations.find((row) => row.conversation_id === activeId) ?? null;

  function togglePin(conversationId: string) {
    setPinnedIds((current) => {
      const next = current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [conversationId, ...current];
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
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

  if (!conversations.length) {
    return (
      <div className={`px-6 py-10 text-center ${isDashboard ? "bd-muted-panel" : "ui-muted-panel"}`}>
        <h2 className={`text-xl font-semibold ${isDashboard ? "text-white/92" : "text-[#fafafa]"}`}>
          No conversations yet
        </h2>
        <p className={`mx-auto mt-2 max-w-md text-sm ${isDashboard ? "text-white/50" : "text-[#8a8a8a]"}`}>
          When you message talent or respond to invites, threads will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className={isWorkspace ? "flex h-full min-h-0 flex-1 flex-col" : "space-y-3"}>
      {!isWorkspace && projectFilterTitle ? (
        <p className={`text-sm ${isDashboard ? "text-white/55" : "text-[#8a8a8a]"}`}>
          Showing conversations related to <span className="font-medium text-white/85">{projectFilterTitle}</span>
        </p>
      ) : null}

      <div
        className={`grid min-h-0 overflow-hidden md:grid-cols-[minmax(240px,1fr)_2fr] ${
          isWorkspace
            ? "h-full flex-1"
            : `h-[70vh] min-h-[420px] rounded-2xl border ${
                isDashboard ? "border-white/8 bg-white/2" : "border-[#262626] bg-[#151515]"
              }`
        }`}
      >
        <aside
          className={`min-h-0 overflow-y-auto border-r md:block ${
            isDashboard ? "border-white/8" : "border-[#262626]"
          } ${active ? "hidden" : "block"}`}
        >
          <div className={`border-b p-3 ${isDashboard ? "border-white/8" : "border-[#262626]"}`}>
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
                className={`w-full rounded-full border py-2 pr-3 pl-9 text-sm outline-none focus:border-white/30 ${
                  isDashboard
                    ? "border-white/10 bg-black/30 text-white placeholder:text-white/35"
                    : "border-[#262626] bg-[#0f0f0f] text-white"
                }`}
              />
            </label>
          </div>
          <ul>
            {filtered.map((row) => {
              const isActive = row.conversation_id === activeId;
              const isPinned = pinnedIds.includes(row.conversation_id);
              return (
                <li key={row.conversation_id}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setActiveId(row.conversation_id)}
                      className={`flex flex-1 items-start gap-3 px-4 py-3 text-left transition ${
                        isActive
                          ? isDashboard
                            ? "bg-white/8"
                            : "bg-[#1e1e1e]"
                          : isDashboard
                            ? "hover:bg-white/4"
                            : "hover:bg-[#1e1e1e]/70"
                      }`}
                    >
                      <ListAvatar url={row.participant_avatar_url} name={row.participant_name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={`truncate text-sm font-semibold ${
                              isDashboard ? "text-white/90" : "text-[#fafafa]"
                            }`}
                          >
                            {row.participant_name}
                          </span>
                          <span className={`shrink-0 text-[11px] ${isDashboard ? "text-white/40" : "text-[#5a5a5a]"}`}>
                            {formatWhen(row.last_message_at)}
                          </span>
                        </span>
                        {row.context_title ? (
                          <span className="mt-0.5 block truncate text-[11px] text-[#2dd4bf]/80">
                            {row.context_title}
                          </span>
                        ) : null}
                        <span
                          className={`mt-0.5 line-clamp-1 block text-xs ${
                            isDashboard ? "text-white/50" : "text-[#8a8a8a]"
                          }`}
                        >
                          {formatConversationPreview(row.last_message_body)}
                        </span>
                      </span>
                      {row.unread_count > 0 ? (
                        <span className="mt-1 inline-flex min-w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#04231e]">
                          {row.unread_count > 99 ? "99+" : row.unread_count}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePin(row.conversation_id)}
                      className={`px-2 text-white/30 hover:text-[#2dd4bf] ${isPinned ? "text-[#2dd4bf]" : ""}`}
                      aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
                    >
                      <Pin className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={`min-h-0 ${active ? "block" : "hidden md:block"}`}>
          {active ? (
            <div className="flex h-full min-h-0 flex-col">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className={`flex items-center gap-1.5 px-4 pt-3 text-xs font-medium md:hidden ${
                  isDashboard ? "text-white/55" : "text-[#8a8a8a]"
                }`}
              >
                <ArrowLeft className="size-3.5" /> All conversations
              </button>
              <ConversationPane conversation={active} currentUserId={currentUserId} variant={variant} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[#5a5a5a]"}`}>
                Select a conversation to read and reply.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ListAvatar({ url, name }: { url: string | null; name: string }) {
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
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0c2a26] text-xs font-semibold text-[#2dd4bf]">
      {initials || "?"}
    </span>
  );
}
