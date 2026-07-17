export type MessagingAttachmentKind = "size_sheet" | "link";

export type MessagingAttachmentPayload = {
  attachment_kind: "size_sheet";
  title: string;
  file_name: string;
  content_type: string;
  bucket: string;
  storage_path: string;
  preview_label: string;
  data_base64?: string | null;
};

export type MessagingLinkPayload = {
  attachment_kind: "link";
  title: string;
  url: string;
  preview_label: string;
  subtitle?: string;
};

export function parseMessagingLinkPayload(body: string | null | undefined): MessagingLinkPayload | null {
  if (!body?.trim()) return null;

  try {
    const parsed = JSON.parse(body) as Partial<MessagingLinkPayload>;
    if (parsed.attachment_kind !== "link") return null;
    const url = typeof parsed.url === "string" ? parsed.url.trim() : "";
    if (!url || !/^https?:\/\//i.test(url)) return null;
    const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Open link";
    return {
      attachment_kind: "link",
      title,
      url,
      preview_label:
        (typeof parsed.preview_label === "string" && parsed.preview_label.trim()) || title,
      subtitle:
        typeof parsed.subtitle === "string" && parsed.subtitle.trim()
          ? parsed.subtitle.trim()
          : undefined,
    };
  } catch {
    return null;
  }
}

export function buildMessagingLinkPayload(input: {
  title: string;
  url: string;
  previewLabel?: string;
  subtitle?: string;
}): MessagingLinkPayload {
  return {
    attachment_kind: "link",
    title: input.title.trim() || "Open link",
    url: input.url.trim(),
    preview_label: input.previewLabel?.trim() || input.title.trim() || "Open link",
    subtitle: input.subtitle?.trim() || undefined,
  };
}

export function parseMessagingAttachmentPayload(body: string | null | undefined): MessagingAttachmentPayload | null {
  if (!body?.trim()) return null;

  try {
    const parsed = JSON.parse(body) as Partial<MessagingAttachmentPayload> & { attachment_kind?: string };
    if (parsed.attachment_kind !== "size_sheet" || !parsed.title) return null;
    return {
      attachment_kind: "size_sheet",
      title: parsed.title,
      file_name: parsed.file_name ?? "attachment.pdf",
      content_type: parsed.content_type ?? "application/pdf",
      bucket: parsed.bucket ?? "conversation-attachments",
      storage_path: parsed.storage_path ?? "",
      preview_label: parsed.preview_label ?? parsed.title,
      data_base64: parsed.data_base64 ?? null,
    };
  } catch {
    return null;
  }
}

export function formatAttachmentPreviewLabel(body: string | null | undefined): string | null {
  const link = parseMessagingLinkPayload(body);
  if (link) return link.preview_label || link.title;

  const payload = parseMessagingAttachmentPayload(body);
  return payload?.preview_label ?? payload?.title ?? null;
}
