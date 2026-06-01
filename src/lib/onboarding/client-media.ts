"use client";

const MAX_HEADSHOT_EDGE = 1200;
const MAX_PDF_PAGES = 3;
const PDF_RENDER_MAX_EDGE = 2560;

export async function resizeImageFile(file: File, maxEdge = MAX_HEADSHOT_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare image for upload.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image for upload."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.85,
    );
  });
}

export async function renderPdfPagesToJpegBlobs(file: File): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const bytes = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = Math.min(pdfDoc.numPages, MAX_PDF_PAGES);
  const blobs: Blob[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const longest = Math.max(viewport.width, viewport.height);
    const scale = Math.min(2, PDF_RENDER_MAX_EDGE / longest);
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(scaled.width);
    canvas.height = Math.floor(scaled.height);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not render PDF page.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport: scaled, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Could not render PDF page."));
            return;
          }
          resolve(result);
        },
        "image/jpeg",
        0.9,
      );
    });

    blobs.push(blob);
  }

  return blobs;
}
