"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BLOCKED_USERS_CHANGED_EVENT, allowsUser, normalizeBlockedUserIds } from "@/lib/app/blocked-visibility-model";
import { inboxNavBadgeCount } from "@/lib/messaging/inbox-partition";
import { INBOX_CHANGED_EVENT } from "@/lib/messaging/reliability";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { HomePendingRequest, InboxConversation, MessageRequest } from "@/types/app";

type Snapshot = { userId: string; conversations: InboxConversation[]; requests: number; pending: number };

export function useBuyerInboxUnread(userId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ userId, conversations: [], requests: 0, pending: 0 });
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    const version = ++requestVersion.current;
    try {
      const [conversations, requests, pending, blockedResult] = await Promise.all([
        supabase.rpc("list_conversations"),
        supabase.rpc("list_message_requests"),
        supabase.rpc("list_pending_requests", { p_limit: 100 }),
        supabase.rpc("my_blocked_user_ids"),
      ]);
      if (!mounted.current || version !== requestVersion.current) return;
      if (blockedResult.error) return;
      const blocked = normalizeBlockedUserIds(blockedResult.data);
      setSnapshot((previous) => {
        const current = previous.userId === userId ? previous : { userId, conversations: [], requests: 0, pending: 0 };
        return {
          userId,
          conversations: conversations.error ? current.conversations : ((conversations.data ?? []) as InboxConversation[]).filter(row => allowsUser(row.participant_user_id, blocked)),
          requests: requests.error ? current.requests : ((requests.data ?? []) as MessageRequest[]).filter(row => allowsUser(row.sender_id, blocked)).length,
          pending: pending.error ? current.pending : ((pending.data ?? []) as HomePendingRequest[]).filter(row => allowsUser(row.inviter_user_id, blocked)).length,
        };
      });
    } catch { /* Keep the last confirmed count through a transient connection failure. */ }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => void load(), 0);
    const supabase = createClientSupabaseClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    };
    const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
    const channel = supabase?.channel(`buyer-inbox-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener(INBOX_CHANGED_EVENT, refresh);
    window.addEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    // Realtime publications vary by environment; a visible-tab refresh reconciles pending actions too.
    const poll = setInterval(visibleRefresh, 60_000);
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      clearTimeout(initial); clearInterval(poll);
      if (timer) clearTimeout(timer);
      window.removeEventListener(INBOX_CHANGED_EVENT, refresh);
      window.removeEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const unreadCount = snapshot.userId === userId
    ? inboxNavBadgeCount(snapshot.conversations) : 0;
  return { unreadCount, refresh: load };
}
