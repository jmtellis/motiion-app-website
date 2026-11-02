"use server";

import { currentBlockedUsers } from "@/lib/app/blocked-visibility";
import { allowsUser } from "@/lib/app/blocked-visibility-model";
import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseRpc } from "@/lib/supabase/rpc";
import { fetchPortfolioOwnerData } from "@/lib/app/portfolio-owner";
import type { AvailabilityResponse } from "@/lib/messaging/request-actions";

import type { ConversationParticipant, MessageRequest } from "@/types/app";

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
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

  if (error || !data) return { ok: false, error: error ?? "Message was not confirmed. Please retry." };

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

  if (error || !data) return { ok: false, error: error ?? "Message was not confirmed. Please retry." };

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

function refreshInboxes() {
  revalidatePath("/inbox");
  revalidatePath("/messages");
}

type MessageRequestResponse = {
  kind?: string;
  request_id?: string;
  conversation_id?: string;
  status?: string;
};

type PendingRequestResponse = {
  ok?: boolean;
  error?: string;
};

export async function fetchMessageRequests(): Promise<{
  requests: MessageRequest[];
  error: string | null;
}> {
  const { data, error } = await supabaseRpc<MessageRequest[]>("list_message_requests");
  const blocked = await currentBlockedUsers();
  return { requests: error || blocked.error ? [] : (data ?? []).filter(row => allowsUser(row.sender_id, blocked.ids)), error: error || blocked.error };
}

export async function respondToMessageRequest(
  requestId: string,
  action: "accept" | "decline" | "block",
): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  const { data, error } = await supabaseRpc<MessageRequestResponse>("respond_to_message_request", {
    p_request_id: requestId,
    p_action: action,
  });
  if (error) return { ok: false, error };
  refreshInboxes();
  if (action === "block") revalidatePath("/", "layout");
  return { ok: true, conversationId: data?.conversation_id };
}

export async function respondToPendingRequest(
  requestKind: string,
  sourceId: string,
  action: "primary" | "negative",
  response?: { responseKind?: AvailabilityResponse; note?: string },
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabaseRpc<PendingRequestResponse>("respond_to_request", {
    p_request_kind: requestKind,
    p_source_id: sourceId,
    p_action: action,
    p_response_kind: response?.responseKind ?? (requestKind === "availability_check" ? action === "primary" ? "available" : "unavailable" : null),
    p_response_note: response?.note?.trim().slice(0, 2000) ?? "",
  });
  if (error) return { ok: false, error };
  if (!data || data.ok === false) {
    return { ok: false, error: data?.error ?? "Could not confirm your response. Please retry." };
  }
  refreshInboxes();
  revalidatePath("/home");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/events");
  revalidatePath("/opportunities");
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function loadPendingRequestContext(kind: string, requestId: string) {
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  const unavailable = { data: null, error: "This request could not be loaded. Refresh your inbox and retry." };
  if (!db || !user) return unavailable;
  if (kind === "availability_check") {
    const { data, error } = await db.from("availability_check_requests").select("status,message,date_ranges,timezone")
      .eq("id", requestId).eq("talent_id", user.id).maybeSingle();
    if (error || !data) return unavailable;
    return { data: { status: data.status, message: data.message, dates: data.date_ranges, timeZone: data.timezone, eventStart: null, eventEnd: null, location: null }, error: null };
  }
  if (kind === "booking_confirmation") {
    const { data, error } = await db.from("booking_confirmation_requests")
      .select("status,event_start,event_end,location,booking:bookings(date_ranges,timezone)").eq("id", requestId).eq("talent_id", user.id).maybeSingle();
    if (error || !data) return unavailable;
    const booking = (Array.isArray(data.booking) ? data.booking[0] : data.booking) as { date_ranges?: unknown; timezone?: string } | null;
    return { data: { status: data.status, message: null, dates: booking?.date_ranges ?? [], timeZone: booking?.timezone ?? null, eventStart: data.event_start, eventEnd: data.event_end, location: data.location }, error: null };
  }
  if (kind === "size_sheet") {
    const { data, error } = await db.from("size_sheet_requests").select("status,message").eq("id", requestId).eq("talent_id", user.id).maybeSingle();
    if (error || !data) return unavailable;
    return { data: { status: data.status, message: data.message, dates: [], timeZone: null, eventStart: null, eventEnd: null, location: null }, error: null };
  }
  return unavailable;
}

export async function loadOwnRequestSizeSheet() {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return { data: null, error: "Sign in again to load your measurements." };
  const owner = await fetchPortfolioOwnerData(user.id);
  if (!owner) return { data: null, error: "Your measurements could not be loaded. Please retry." };
  return { data: { userId: user.id, name: owner.displayName, headshotUrl: owner.headshotUrls[0] ?? null,
    location: owner.location, representation: owner.representation, height: owner.height, sizing: owner.sizing }, error: null };
}

/** Shares only the current talent's requested PDF through the same RPC as iOS. */
export async function deliverRequestSizeSheet(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return { ok: false, error: "Sign in again to share your size sheet." };
  const requestId = String(form.get("requestId") ?? "");
  const deliveryId = String(form.get("deliveryId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(deliveryId)) return { ok: false, error: "Please reopen the request and retry." };
  const { data: request, error } = await supabase.from("size_sheet_requests")
    .select("id,requester_id,status").eq("id", requestId).eq("talent_id", user.id).maybeSingle();
  if (error || !request || !["pending", "fulfilled"].includes(request.status)) return { ok: false, error: "This request is no longer available. Refresh your inbox." };
  const pdf = form.get("pdf");
  if (!(pdf instanceof Blob) || pdf.type !== "application/pdf" || pdf.size === 0 || pdf.size > 700_000) {
    return { ok: false, error: "The size sheet could not be prepared. Try a smaller profile photo and retry." };
  }
  const bytes = Buffer.from(await pdf.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { ok: false, error: "The attachment must be a PDF." };
  // Reconcile a network retry before posting the same attachment again.
  const previous = await supabase.from("messages").select("id").eq("sender_id", user.id)
    .eq("message_type", "attachment").like("body", `%${deliveryId}%`).limit(1);
  if (previous.error) return { ok: false, error: "Could not check delivery. Please retry." };
  if (previous.data?.length) return { ok: true };
  const sent = await supabase.rpc("deliver_size_sheet_chat_message", {
    p_target_user_id: request.requester_id, p_request_id: request.id, p_note: String(form.get("note") ?? "").trim().slice(0, 2000),
    p_attachment: { attachment_kind: "size_sheet", title: "Size sheet", preview_label: "Size sheet", file_name: "size-sheet.pdf",
      content_type: "application/pdf", bucket: "conversation-attachments", storage_path: "", data_base64: bytes.toString("base64"), delivery_id: deliveryId },
  });
  if (sent.error || sent.data?.ok !== true) return { ok: false, error: "The size sheet could not be delivered. Please retry." };
  refreshInboxes();
  return { ok: true };
}

export async function markConversationsRead(conversationIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!conversationIds.length) return { ok: true };
  const { error } = await supabaseRpc<null>("mark_conversations_read", {
    p_conversation_ids: conversationIds,
  });
  if (error) return { ok: false, error };
  refreshInboxes();
  return { ok: true };
}

export async function markConversationsUnread(
  conversationIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!conversationIds.length) return { ok: true };
  const { error } = await supabaseRpc<null>("mark_conversations_unread", {
    p_conversation_ids: conversationIds,
  });
  if (error) return { ok: false, error };
  refreshInboxes();
  return { ok: true };
}

export async function archiveConversations(conversationIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!conversationIds.length) return { ok: true };
  const { error } = await supabaseRpc<null>("archive_conversations", {
    p_conversation_ids: conversationIds,
  });
  if (error) return { ok: false, error };
  refreshInboxes();
  return { ok: true };
}

export async function fetchConversationParticipants(
  conversationId: string,
): Promise<{ participants: ConversationParticipant[]; error: string | null }> {
  const { data, error } = await supabaseRpc<ConversationParticipant[]>("list_conversation_participants", {
    p_conversation_id: conversationId,
  });
  return { participants: data ?? [], error };
}

export async function reportMessageOrUser(input: {
  reportedUserId: string;
  reason: string;
  messageId?: string | null;
  conversationId?: string | null;
  details?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "A reason is required." };
  const { error } = await supabaseRpc<string>("report_message_or_user", {
    p_reported_user_id: input.reportedUserId,
    p_message_id: input.messageId ?? null,
    p_conversation_id: input.conversationId ?? null,
    p_reason: reason,
    p_details: input.details?.trim() || null,
  });
  if (error) return { ok: false, error };
  return { ok: true };
}
