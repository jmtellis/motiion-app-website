import { cache } from "react";

import { fetchMessageRequests } from "@/lib/app/conversations";
import { supabaseRpc } from "@/lib/supabase/rpc";
import type { HomePendingRequest, InboxConversation, MessageRequest } from "@/types/app";

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

export const fetchInboxBundle = cache(async () => {
  const [conversationsResult, pendingResult, messageRequestsResult] = await Promise.all([
    fetchInboxConversations(),
    fetchChatPendingRequests(),
    fetchMessageRequests(),
  ]);

  return {
    conversations: conversationsResult.conversations,
    error: conversationsResult.error,
    pendingRequests: pendingResult.requests,
    pendingError: pendingResult.error,
    messageRequests: messageRequestsResult.requests as MessageRequest[],
    messageRequestsError: messageRequestsResult.error,
  };
});
