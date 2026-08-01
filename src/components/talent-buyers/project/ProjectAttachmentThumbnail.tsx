"use client";

import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { renderPdfFirstPageThumbnail } from "@/lib/messaging/pdf-thumbnail";
import { clonePdfBytes } from "@/lib/messaging/resolve-attachment-data";

import "./project-attachment-thumb.css";

function isImageContentType(contentType: string | null | undefined, fileName?: string | null) {
  const type = contentType?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return true;
  const name = fileName?.toLowerCase() ?? "";
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(name);
}

function isPdfContentType(contentType: string | null | undefined, fileName?: string | null) {
  const type = contentType?.toLowerCase() ?? "";
  if (type.includes("pdf")) return true;
  const name = fileName?.toLowerCase() ?? "";
  return name.endsWith(".pdf");
}

export function ProjectAttachmentThumbnail({
  url,
  contentType,
  fileName,
  title,
  className = "",
}: {
  url?: string | null;
  contentType?: string | null;
  fileName?: string | null;
  title?: string;
  className?: string;
}) {
  const href = url?.trim() || "";
  const isImage = Boolean(href) && isImageContentType(contentType, fileName);
  const isPdf = Boolean(href) && isPdfContentType(contentType, fileName);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(isPdf);

  useEffect(() => {
    if (!isPdf || !href) {
      setPdfPreview(null);
      setPdfFailed(false);
      setIsLoadingPdf(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPdf(true);
    setPdfFailed(false);
    setPdfPreview(null);

    void (async () => {
      try {
        const response = await fetch(href);
        if (!response.ok) throw new Error("Could not load PDF");
        const bytes = new Uint8Array(await response.arrayBuffer());
        const thumbnail = await renderPdfFirstPageThumbnail(clonePdfBytes(bytes));
        if (cancelled) return;
        if (!thumbnail) {
          setPdfFailed(true);
          return;
        }
        setPdfPreview(thumbnail);
      } catch {
        if (!cancelled) setPdfFailed(true);
      } finally {
        if (!cancelled) setIsLoadingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [href, isPdf]);

  const shellClass = `project-attachment-thumb ${className}`.trim();

  if (isImage) {
    return (
      <span className={shellClass} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt="" className="project-attachment-thumb__image" />
      </span>
    );
  }

  if (isPdf) {
    if (isLoadingPdf) {
      return (
        <span className={`${shellClass} project-attachment-thumb--loading`} aria-hidden>
          <Loader2 className="size-3.5 animate-spin" />
        </span>
      );
    }

    if (pdfPreview && !pdfFailed) {
      return (
        <span className={shellClass} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pdfPreview} alt="" className="project-attachment-thumb__image" />
        </span>
      );
    }
  }

  return (
    <span className={`${shellClass} project-attachment-thumb--fallback`} aria-hidden title={title}>
      <FileText className="size-4" strokeWidth={2} />
    </span>
  );
}
