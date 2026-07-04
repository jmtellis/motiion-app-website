"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { supabaseRpc } from "@/lib/supabase/rpc";

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar_url: string | null;
  body: string | null;
  message_type: string;
  created_at: string;
  deleted_at: string | null;
};

export async function fetchConversationMessages(
  conversationId: string,
): Promise<{ messages: ConversationMessage[]; error: string | null }> {
  const { data, error } = await supabaseRpc<ConversationMessage[]>("list_conversation_messages", {
    p_conversation_id: conversationId,
  });
  return { messages: data ?? [], error };
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message cannot be empty." };

  const { data, error } = await supabaseRpc<string>("send_conversation_message", {
    p_conversation_id: conversationId,
    p_body: trimmed,
  });

  if (error) return { ok: false, error };

  await trackServerEvent("message_sent", { conversation_id: conversationId });
  revalidatePath("/inbox");
  revalidatePath("/messages");
  return { ok: true, messageId: data ?? undefined };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await supabaseRpc<null>("mark_conversation_read", { p_conversation_id: conversationId });
}

type StartConversationResponse = {
  conversation_id?: string;
  request_id?: string;
  status?: string;
};

export async function startConversationWith(input: {
  targetUserId: string;
  contextType?: string;
  contextId?: string;
  initialMessage?: string;
}): Promise<{ ok: boolean; conversationId?: string; pendingRequest?: boolean; error?: string }> {
  const { data, error } = await supabaseRpc<StartConversationResponse>("start_conversation_or_request", {
    p_target_user_id: input.targetUserId,
    p_context_type: input.contextType ?? null,
    p_context_id: input.contextId ?? null,
    p_initial_message: input.initialMessage ?? null,
  });

  if (error) return { ok: false, error };

  await trackServerEvent("talent_contacted", { target_user_id: input.targetUserId });

  if (data?.conversation_id) {
    revalidatePath("/inbox");
    revalidatePath("/messages");
    return { ok: true, conversationId: data.conversation_id };
  }
  if (data?.request_id) {
    return { ok: true, pendingRequest: true };
  }
  return { ok: false, error: "Could not start the conversation." };
}
