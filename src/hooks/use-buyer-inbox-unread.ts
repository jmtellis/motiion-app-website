"use client";

import { useCallback, useEffect, useState } from "react";

import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { InboxConversation } from "@/types/app";

export function useBuyerInboxUnread() {
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase.rpc("list_conversations");
    if (error || !data) {
      setUnreadCount(0);
      return;
    }

    const conversations = data as InboxConversation[];
    const total = conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
    setUnreadCount(total);
  }, []);

  useEffect(() => {
    void load();

    function onFocus() {
      void load();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return { unreadCount, refresh: load };
}
