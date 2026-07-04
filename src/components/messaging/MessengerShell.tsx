"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ConversationPane } from "@/components/messaging/ConversationPane";
import type { InboxConversation } from "@/types/app";

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MessengerShell({
  conversations,
  currentUserId,
  error,
  variant = "default",
}: {
  conversations: InboxConversation[];
  currentUserId: string;
  error: string | null;
  variant?: "default" | "dashboard";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isDashboard = variant === "dashboard";
  const active = conversations.find((row) => row.conversation_id === activeId) ?? null;

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
    <div
      className={`grid h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border md:grid-cols-[minmax(240px,1fr)_2fr] ${
        isDashboard ? "border-white/8 bg-white/2" : "border-[#262626] bg-[#151515]"
      }`}
    >
      <aside
        className={`min-h-0 overflow-y-auto border-r md:block ${
          isDashboard ? "border-white/8" : "border-[#262626]"
        } ${active ? "hidden" : "block"}`}
      >
        <ul>
          {conversations.map((row) => {
            const isActive = row.conversation_id === activeId;
            return (
              <li key={row.conversation_id}>
                <button
                  type="button"
                  onClick={() => setActiveId(row.conversation_id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
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
                    <span
                      className={`mt-0.5 line-clamp-1 block text-xs ${
                        isDashboard ? "text-white/50" : "text-[#8a8a8a]"
                      }`}
                    >
                      {row.last_message_body?.trim() || "No messages yet"}
                    </span>
                  </span>
                  {row.unread_count > 0 ? (
                    <span className="mt-1 inline-flex min-w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#04231e]">
                      {row.unread_count > 99 ? "99+" : row.unread_count}
                    </span>
                  ) : null}
                </button>
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
