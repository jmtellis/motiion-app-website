import { cache } from "react";

import { supabaseRpc } from "@/lib/supabase/rpc";
import type { HomePendingRequest, InboxConversation } from "@/types/app";

export const fetchInboxConversations = cache(async () => {
  const { data, error } = await supabaseRpc<InboxConversation[]>("list_conversations");
  return {
    conversations: error ? [] : (data ?? []),
    error,
  };
});

export const fetchChatPendingRequests = cache(async (limit = 24) => {
  const { data, error } = await supabaseRpc<HomePendingRequest[]>("list_pending_requests", {
    p_limit: limit,
  });
  return {
    requests: error ? [] : (data ?? []),
    error,
  };
});
