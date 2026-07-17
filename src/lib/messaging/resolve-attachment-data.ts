"use client";

import type { MessagingAttachmentPayload } from "@/lib/messaging/attachment-payload";
import { createClientSupabaseClient } from "@/lib/supabase/client";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** pdf.js transfers the underlying buffer to its worker — always clone before handing bytes to it. */
export function clonePdfBytes(bytes: Uint8Array): Uint8Array {
  return bytes.slice();
}

export async function resolveAttachmentPdfBytes(payload: MessagingAttachmentPayload): Promise<Uint8Array> {
  if (payload.data_base64?.trim()) {
    return base64ToBytes(payload.data_base64.trim());
  }

  if (!payload.storage_path.trim()) {
    throw new Error("Attachment data is unavailable.");
  }

  const supabase = createClientSupabaseClient();
  if (!supabase) {
    throw new Error("Could not connect to storage.");
  }

  const { data, error } = await supabase.storage
    .from(payload.bucket || "conversation-attachments")
    .download(payload.storage_path);

  if (error || !data) {
    throw error ?? new Error("Could not download attachment.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

export function createPdfBlobUrl(bytes: Uint8Array, contentType = "application/pdf"): string {
  const copy = clonePdfBytes(bytes);
  const buffer = copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: contentType });
  return URL.createObjectURL(blob);
}
