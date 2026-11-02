"use client";

import { createClientSupabaseClient } from "@/lib/supabase/client";
import { MAX_RESUME_BYTES, MAX_RESUME_PAGE_BYTES } from "@/lib/onboarding/resume-upload";

const MAX_HEADSHOT_EDGE = 1200;
const MAX_PDF_PAGES = 3;
const PDF_RENDER_MAX_EDGE = 2560;
const uploadedResumeSources = new WeakMap<File, { userId: string; path: string }>();

/** Upload large originals directly; only bounded extraction pages cross the action. */
export async function prepareResumeUpload(file: File): Promise<FormData> {
  if (file.size === 0 || file.size > MAX_RESUME_BYTES) throw new Error("Choose a resume under 20 MB.");
  const supabase = createClientSupabaseClient();
  if (!supabase) throw new Error("Resume upload is temporarily unavailable.");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in again before uploading your resume.");
  const form = new FormData();
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  let source: Blob;
  let pages: Blob[];
  if (isPdf) {
    source = new Blob([file], { type: "application/pdf" });
    pages = await renderPdfPagesToJpegBlobs(file);
  } else {
    if (!file.type.startsWith("image/")) throw new Error("Choose a PDF or image of your resume.");
    let image: Blob;
    try { image = await resizeImageFile(file, PDF_RENDER_MAX_EDGE); }
    catch { throw new Error("This browser couldn’t read that image. Use a JPEG, PNG, or PDF resume."); }
    source = image;
    pages = [image];
  }
  const boundedPages = await Promise.all(pages.map(compressResumePage));
  boundedPages.forEach((page, index) => form.append("pages", page, `resume_page_${index + 1}.jpg`));
  let saved = uploadedResumeSources.get(file);
  if (saved?.userId !== user.id) saved = undefined;
  if (!saved) {
    const path = `${user.id.toLowerCase()}/resume_${crypto.randomUUID()}.${isPdf ? "pdf" : "jpg"}`;
    const { error } = await supabase.storage.from("resumes").upload(path, source, { contentType: source.type, upsert: false });
    if (error) throw new Error(error.message || "Couldn’t upload your resume. Please try again.");
    saved = { userId: user.id, path };
    uploadedResumeSources.set(file, saved);
  }
  form.append("sourcePath", saved.path);
  return form;
}

async function compressResumePage(page: Blob): Promise<Blob> {
  if (page.size <= MAX_RESUME_PAGE_BYTES) return page;
  let reduced = page;
  for (const edge of [2200, 1800, 1400, 1100]) {
    reduced = await resizeImageFile(new File([reduced], "resume-page.jpg", { type: "image/jpeg" }), edge);
    if (reduced.size <= MAX_RESUME_PAGE_BYTES) return reduced;
  }
  throw new Error("This page is too complex to read. Try a simpler PDF or a clear photo of your resume.");
}

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
