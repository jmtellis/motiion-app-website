import { currentBlockedUsers } from "@/lib/app/blocked-visibility";
import { allowsUser } from "@/lib/app/blocked-visibility-model";
import { cache } from "react";

import { fetchMessageRequests } from "@/lib/app/conversations";
import { supabaseRpc } from "@/lib/supabase/rpc";
import type { HomePendingRequest, InboxConversation, MessageRequest } from "@/types/app";

export const fetchInboxConversations = cache(async () => {
  const { data, error } = await supabaseRpc<InboxConversation[]>("list_conversations");
  const blocked = await currentBlockedUsers();
  return {
    conversations: error || blocked.error ? [] : (data ?? []).filter(row => allowsUser(row.participant_user_id, blocked.ids)),
    error: error || blocked.error,
  };
});

export const fetchChatPendingRequests = cache(async (limit = 100) => {
  const { data, error } = await supabaseRpc<HomePendingRequest[]>("list_pending_requests", {
    p_limit: limit,
  });
  const blocked = await currentBlockedUsers();
  return {
    requests: error || blocked.error ? [] : (data ?? []).filter(row => allowsUser(row.inviter_user_id, blocked.ids)),
    error: error || blocked.error,
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
