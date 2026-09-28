"use client";

import { createClientSupabaseClient } from "@/lib/supabase/client";

/** iOS `HeadshotLayout.cardAspectRatio` — headshot and highlight covers share it. */
export const CARD_ASPECT = 177 / 234;
const DISPLAY_MAX_EDGE = 1200;
const SOURCE_MAX_EDGE = 4096;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

export type CropRect = { x: number; y: number; width: number; height: number };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load that image."));
    image.src = src;
  });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare that image."))), "image/jpeg", 0.85);
    } catch {
      reject(new Error("This image can't be edited in the browser. Upload it again to crop it."));
    }
  });
}

export async function renderCrop(image: HTMLImageElement, rect: CropRect, maxEdge = DISPLAY_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare that image.");
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return toJpeg(canvas);
}

export function centeredCrop(width: number, height: number, aspect = CARD_ASPECT): CropRect {
  if (width / height > aspect) {
    const cropWidth = height * aspect;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / aspect;
  // Headshots frame faces near the top; bias the default crop upward like iOS.
  return { x: 0, y: Math.max(0, (height - cropHeight) * 0.3), width, height: cropHeight };
}

/** Display (default card crop) plus the full-resolution source kept for re-cropping. */
export async function prepareCardImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Choose an image under 20 MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const full = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    const [display, source] = await Promise.all([
      renderCrop(image, centeredCrop(image.naturalWidth, image.naturalHeight)),
      renderCrop(image, full, SOURCE_MAX_EDGE),
    ]);
    return { display, source };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function readVideoMetadata(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: Number.isFinite(video.duration) ? video.duration : 0 });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video format isn't supported. Use an MP4 or MOV file."));
    };
    video.src = url;
  });
}

function storage() {
  const client = createClientSupabaseClient();
  if (!client) throw new Error("Unable to connect. Try again.");
  return client.storage;
}

export async function uploadPublicObject(bucket: string, path: string, body: Blob, contentType: string) {
  const bucketApi = storage().from(bucket);
  const { error } = await bucketApi.upload(path, body, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  return bucketApi.getPublicUrl(path).data.publicUrl;
}

export function videoExtension(file: File) {
  if (file.type === "video/quicktime" || /\.mov$/i.test(file.name)) return { ext: "mov", type: "video/quicktime" };
  return { ext: "mp4", type: "video/mp4" };
}
