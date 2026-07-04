"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
  type ConversationMessage,
} from "@/lib/app/conversations";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { InboxConversation } from "@/types/app";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [draft, setDraft] = useState("");
  const [isSending, startSending] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDashboard = variant === "dashboard";

  const conversationId = conversation.conversation_id;

  const loadMessages = useCallback(async () => {
    const result = await fetchConversationMessages(conversationId);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setMessages(result.messages);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    void loadMessages();
    void markConversationRead(conversationId);
  }, [conversationId, loadMessages]);

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function handleSend() {
    const body = draft.trim();
    if (!body || isSending) return;

    startSending(async () => {
      const result = await sendConversationMessage(conversationId, body);
      if (!result.ok) {
        setError(result.error ?? "Could not send message.");
        return;
      }
      setDraft("");
      await loadMessages();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className={`flex items-center gap-3 border-b px-4 py-3 ${
          isDashboard ? "border-white/8" : "border-[var(--line)]"
        }`}
      >
        <PaneAvatar url={conversation.participant_avatar_url} name={conversation.participant_name} />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
            {conversation.participant_name}
          </p>
          {conversation.context_title ? (
            <p className={`truncate text-xs ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>
              {conversation.context_title}
            </p>
          ) : null}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>Loading messages…</p>
        ) : null}
        {!loading && !messages.length ? (
          <p className={`text-sm ${isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>
            No messages yet. Say hello!
          </p>
        ) : null}
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMine
                    ? "bg-[#fafafa] text-[#0a0a0a]"
                    : isDashboard
                      ? "bg-white/8 text-white/88"
                      : "bg-[#1e1e1e] text-[#eaeaea]"
                }`}
              >
                {message.deleted_at ? (
                  <em className="opacity-60">Message deleted</em>
                ) : (
                  message.body
                )}
                <p className={`mt-1 text-[10px] ${isMine ? "text-black/50" : isDashboard ? "text-white/40" : "text-[var(--ink-soft)]"}`}>
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="px-4 pb-2 text-xs text-amber-500">{error}</p>
      ) : null}

      <footer className={`border-t px-4 py-3 ${isDashboard ? "border-white/8" : "border-[var(--line)]"}`}>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Write a message…"
            className={`min-h-[44px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none ${
              isDashboard
                ? "border-white/12 bg-white/4 text-white/90 placeholder:text-white/35 focus:border-white/30"
                : "border-[#262626] bg-[#0a0a0a] text-[#eaeaea] placeholder:text-[#5a5a5a] focus:border-[rgb(45_212_191_/_0.55)]"
            }`}
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            className="rounded-[8px] bg-[#fafafa] px-4 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#e6e6e6] disabled:opacity-40"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
      </footer>
    </div>
  );
}

function PaneAvatar({ url, name }: { url: string | null; name: string }) {
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
