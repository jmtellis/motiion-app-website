"use client";

import { useCallback, useEffect, useState } from "react";

import { inboxNavBadgeCount } from "@/lib/messaging/inbox-partition";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { HomePendingRequest, InboxConversation, MessageRequest } from "@/types/app";

export function useBuyerInboxUnread() {
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const [conversationsResult, requestsResult, pendingResult] = await Promise.all([
      supabase.rpc("list_conversations"),
      supabase.rpc("list_message_requests"),
      supabase.rpc("list_pending_requests", { p_limit: 24 }),
    ]);

    if (conversationsResult.error && requestsResult.error && pendingResult.error) {
      setUnreadCount(0);
      return;
    }

    setUnreadCount(
      inboxNavBadgeCount(
        (conversationsResult.data ?? []) as InboxConversation[],
        ((requestsResult.data ?? []) as MessageRequest[]).length,
        ((pendingResult.data ?? []) as HomePendingRequest[]).length,
      ),
    );
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const supabase = createClientSupabaseClient();
    if (!supabase) return () => clearTimeout(initial);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 400);
    };

    const channel = supabase
      .channel("buyer-inbox-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, refresh)
      .subscribe();

    return () => {
      clearTimeout(initial);
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return { unreadCount, refresh: load };
}
