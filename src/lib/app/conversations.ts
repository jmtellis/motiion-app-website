"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

export async function sendConversationLinkMessage(
  conversationId: string,
  payload: {
    title: string;
    url: string;
    previewLabel?: string;
    subtitle?: string;
  },
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const url = payload.url.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "A valid link URL is required." };
  }

  const body = {
    attachment_kind: "link",
    title: payload.title.trim() || "Open link",
    url,
    preview_label: payload.previewLabel?.trim() || payload.title.trim() || "Open link",
    subtitle: payload.subtitle?.trim() || null,
  };

  const { data, error } = await supabaseRpc<string>("send_conversation_attachment_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });

  if (error) return { ok: false, error };

  await trackServerEvent("message_sent", {
    conversation_id: conversationId,
    message_type: "attachment",
    attachment_kind: "link",
  });
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
  link?: {
    title: string;
    url: string;
    previewLabel?: string;
    subtitle?: string;
  };
}): Promise<{ ok: boolean; conversationId?: string; pendingRequest?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: existingConversationId, error: lookupError } = await supabase.rpc(
    "get_existing_conversation",
    {
      p_current_user_id: user.id,
      p_target_user_id: input.targetUserId,
      p_context_type: input.contextType ?? null,
      p_context_id: input.contextId ?? null,
    },
  );

  const linkUrl = input.link?.url?.trim();
  const hasLink = Boolean(linkUrl && /^https?:\/\//i.test(linkUrl));
  const textMessage =
    input.initialMessage?.trim() || (hasLink ? "Sharing a link with you." : "Hi!");

  async function sendFollowUpLink(conversationId: string) {
    if (!hasLink || !input.link || !linkUrl) return { ok: true as const };
    return sendConversationLinkMessage(conversationId, {
      ...input.link,
      url: linkUrl,
    });
  }

  if (!lookupError && existingConversationId) {
    const conversationId = existingConversationId as string;
    const sent = await sendConversationMessage(conversationId, textMessage);
    if (!sent.ok) return { ok: false, error: sent.error ?? "Could not send message." };

    const linkResult = await sendFollowUpLink(conversationId);
    if (!linkResult.ok) return { ok: false, error: linkResult.error ?? "Could not send link." };

    revalidatePath("/inbox");
    revalidatePath("/messages");
    return { ok: true, conversationId };
  }

  // Message requests only accept a text body — include the URL as a fallback.
  // Once an open conversation is created, also send a dedicated link card.
  const bootstrapMessage =
    hasLink && linkUrl && !textMessage.includes(linkUrl)
      ? `${textMessage}\n\n${linkUrl}`
      : textMessage;

  const { data, error } = await supabaseRpc<StartConversationResponse>("start_conversation_or_request", {
    p_target_user_id: input.targetUserId,
    p_context_type: input.contextType ?? null,
    p_context_id: input.contextId ?? null,
    p_initial_message: bootstrapMessage,
  });

  if (error) return { ok: false, error };

  await trackServerEvent("talent_contacted", { target_user_id: input.targetUserId });

  if (data?.conversation_id) {
    const conversationId = data.conversation_id;
    const linkResult = await sendFollowUpLink(conversationId);
    if (!linkResult.ok) return { ok: false, error: linkResult.error ?? "Could not send link." };
    revalidatePath("/inbox");
    revalidatePath("/messages");
    return { ok: true, conversationId };
  }
  if (data?.request_id) {
    return { ok: true, pendingRequest: true };
  }
  return { ok: false, error: "Could not start the conversation." };
}
