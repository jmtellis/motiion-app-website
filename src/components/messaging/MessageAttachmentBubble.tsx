"use client";

import { FileText, Ruler } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AttachmentPdfViewer } from "@/components/messaging/AttachmentPdfViewer";
import type { MessagingAttachmentPayload } from "@/lib/messaging/attachment-payload";
import { renderPdfFirstPageThumbnail } from "@/lib/messaging/pdf-thumbnail";
import { createPdfBlobUrl, clonePdfBytes, resolveAttachmentPdfBytes } from "@/lib/messaging/resolve-attachment-data";

type MessageAttachmentBubbleProps = {
  payload: MessagingAttachmentPayload;
  isMine: boolean;
  variant?: "default" | "dashboard";
};

export function MessageAttachmentBubble({ payload, isMine, variant = "default" }: MessageAttachmentBubbleProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const viewerUrlRef = useRef<string | null>(null);
  const isDashboard = variant === "dashboard";

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setIsLoadingPreview(true);
      try {
        const bytes = await resolveAttachmentPdfBytes(payload);
        if (cancelled) return;
        pdfBytesRef.current = bytes;
        const thumbnail = await renderPdfFirstPageThumbnail(clonePdfBytes(bytes));
        if (!cancelled) {
          setPreviewUrl(thumbnail);
        }
      } catch {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    return () => {
      if (viewerUrlRef.current) {
        URL.revokeObjectURL(viewerUrlRef.current);
      }
    };
  }, []);

  async function ensurePdfBytes(): Promise<Uint8Array> {
    if (pdfBytesRef.current) return pdfBytesRef.current;
    const bytes = await resolveAttachmentPdfBytes(payload);
    pdfBytesRef.current = bytes;
    return bytes;
  }

  async function openViewer() {
    setViewerOpen(true);
    if (viewerUrlRef.current) {
      setViewerUrl(viewerUrlRef.current);
      return;
    }

    setViewerLoading(true);
    setViewerError(null);

    try {
      const bytes = await ensurePdfBytes();
      const url = createPdfBlobUrl(bytes, payload.content_type);
      viewerUrlRef.current = url;
      setViewerUrl(url);
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Could not open this attachment.");
    } finally {
      setViewerLoading(false);
    }
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  async function handleDownload() {
    try {
      const bytes = await ensurePdfBytes();
      const url = createPdfBlobUrl(bytes, payload.content_type);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.file_name || "attachment.pdf";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Could not download attachment.");
    }
  }

  async function handlePrint() {
    try {
      const bytes = await ensurePdfBytes();
      const url = createPdfBlobUrl(bytes, payload.content_type);
      const printWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!printWindow) {
        URL.revokeObjectURL(url);
        setViewerError("Pop-up blocked. Allow pop-ups to print this attachment.");
        return;
      }
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
      });
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Could not print attachment.");
    }
  }

  const Icon = payload.attachment_kind === "size_sheet" ? Ruler : FileText;

  return (
    <>
      <button
        type="button"
        onClick={() => void openViewer()}
        className={`w-[220px] max-w-full overflow-hidden rounded-2xl border text-left transition hover:brightness-110 ${
          isMine
            ? "border-[#fafafa]/20 bg-[#fafafa] text-[#0a0a0a]"
            : isDashboard
              ? "border-white/10 bg-white/8 text-white/90"
              : "border-[#2a2a2a] bg-[#1e1e1e] text-[#eaeaea]"
        }`}
      >
        <div className="relative h-[280px] w-full overflow-hidden bg-white/[0.04]">
          {isLoadingPreview ? (
            <div className="flex h-full items-center justify-center text-xs opacity-60">Loading preview…</div>
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <Icon className="size-7 opacity-50" aria-hidden />
              <span className="text-sm font-semibold">{payload.preview_label || payload.title}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold">{payload.title}</p>
          <p className={`mt-0.5 text-xs ${isMine ? "text-black/50" : isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"}`}>
            Tap to view full sheet
          </p>
        </div>
      </button>

      <AttachmentPdfViewer
        open={viewerOpen}
        title={payload.title}
        fileName={payload.file_name}
        pdfUrl={viewerUrl}
        loading={viewerLoading}
        error={viewerError}
        onClose={closeViewer}
        onDownload={() => void handleDownload()}
        onPrint={() => void handlePrint()}
      />
    </>
  );
}
