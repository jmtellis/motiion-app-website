"use client";

import { clonePdfBytes } from "@/lib/messaging/resolve-attachment-data";

const PREVIEW_MAX_EDGE = 440;

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  return pdfjs;
}

export async function renderPdfFirstPageThumbnail(bytes: Uint8Array): Promise<string | null> {
  try {
    const pdfjs = await loadPdfJs();
    const task = pdfjs.getDocument({ data: clonePdfBytes(bytes) });
    const pdfDoc = await task.promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const longest = Math.max(viewport.width, viewport.height);
    const scale = PREVIEW_MAX_EDGE / longest;
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(scaled.width);
    canvas.height = Math.floor(scaled.height);
    const context = canvas.getContext("2d");

    if (!context) { await task.destroy(); return null; }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: scaled, canvas }).promise;

    const image = canvas.toDataURL("image/jpeg", 0.82);
    await task.destroy();
    return image;
  } catch {
    return null;
  }
}
