import { cache } from "react";

import { supabaseRpc } from "@/lib/supabase/rpc";
import type { InboxConversation } from "@/types/app";

export const fetchInboxConversations = cache(async () => {
  const { data, error } = await supabaseRpc<InboxConversation[]>("list_conversations");
  return {
    conversations: error ? [] : (data ?? []),
    error,
  };
});
