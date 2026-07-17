"use client";

import { Download, Printer, X } from "lucide-react";
import { useCallback, useEffect } from "react";

type AttachmentPdfViewerProps = {
  open: boolean;
  title: string;
  pdfUrl: string | null;
  fileName: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
};

export function AttachmentPdfViewer({
  open,
  title,
  pdfUrl,
  fileName,
  loading = false,
  error = null,
  onClose,
  onDownload,
  onPrint,
}: AttachmentPdfViewerProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white/92">{title}</h2>
          <p className="truncate text-xs text-white/45">{fileName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={!pdfUrl}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!pdfUrl}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            <Printer className="size-3.5" aria-hidden />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/12 p-2 text-white/70 transition hover:border-white/25 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-[#0a0a0a]">
        {loading ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/50">Loading PDF…</p>
        ) : null}
        {!loading && error ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-amber-200/90">
            {error}
          </p>
        ) : null}
        {!loading && !error && pdfUrl ? (
          <iframe title={title} src={pdfUrl} className="h-full w-full border-0 bg-white" />
        ) : null}
      </div>
    </div>
  );
}
