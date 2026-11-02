"use client";

import { Download, Printer, X } from "lucide-react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import { useEffect, useState } from "react";
import { loadPdfJs } from "@/lib/messaging/pdf-thumbnail";
import { Dialog } from "@/components/ui/Dialog";

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
  return (
    <Dialog open={open} onClose={onClose} label={title}><div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[var(--ui-surface)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--ui-text)]">{title}</h2>
          <p className="truncate text-xs text-[var(--ui-muted)]">{fileName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={!pdfUrl}
            className="ui-button ui-button--secondary gap-1.5"
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!pdfUrl}
            className="ui-button ui-button--secondary gap-1.5"
          >
            <Printer className="size-3.5" aria-hidden />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-[var(--ui-surface-soft)]">
        {loading ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ui-muted)]">Loading PDF…</p>
        ) : null}
        {!loading && error ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--ui-danger)]">
            {error}
          </p>
        ) : null}
        {!loading && !error && pdfUrl ? (
          <PdfPages key={pdfUrl} url={pdfUrl} title={title} />
        ) : null}
      </div>
    </div></Dialog>
  );
}


/** PDF.js also works in browsers that cannot embed blob PDFs in an iframe. */
function PdfPages({ url, title }: { url: string; title: string }) {
  const [pages, setPages] = useState<{ image: string; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let pdfDocument: PDFDocumentProxy | null = null;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    void (async () => {
      const [pdfjs, response] = await Promise.all([loadPdfJs(), fetch(url, { signal: controller.signal })]);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (cancelled) return;
      loadingTask = pdfjs.getDocument({ data: bytes });
      pdfDocument = await loadingTask.promise;
      if (cancelled) { await loadingTask.destroy(); return; }
      if (pdfDocument.numPages > 50) throw new Error("This PDF is too long to preview. Download it to view every page.");
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1500 / original.width) });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PDF preview is unavailable. Download the file to open it.");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const text = (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
        if (cancelled) return;
        const image = canvas.toDataURL("image/png");
        setPages((current) => [...current, { image, text }]);
      }
    })().catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not preview PDF. Download the file to open it."); });
    return () => { cancelled = true; controller.abort(); void loadingTask?.destroy().catch(() => undefined); };
  }, [url]);
  return <div className="h-full overflow-auto p-3" aria-label={`${title} pages`}>
    {!pages.length && !error ? <p role="status" className="p-6 text-center text-sm">Rendering PDF…</p> : null}
    {error ? <p role="alert" className="p-4 text-[var(--ui-danger)]">{error}</p> : null}
    {pages.map((page, index) => <figure key={index} className="mx-auto mb-3 max-w-4xl bg-white shadow-sm">
      {/* PDF is generated locally; next/image does not process data URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={page.image} alt={`${title}, page ${index + 1}`} className="h-auto w-full" />
      <figcaption className="sr-only">{page.text}</figcaption>
    </figure>)}
  </div>;
}
