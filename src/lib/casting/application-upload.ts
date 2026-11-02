"use client";

import { createClientSupabaseClient } from "@/lib/supabase/client";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import { castingMediaError } from "./application-media";

const uploadedPhotos = new WeakMap<File, { userId: string; path: string; original: string }>();
const uploadedResumes = new WeakMap<File, { userId: string; path: string }>();

/** Originals go to owned Storage, never through the hosting-limited action body. */
export async function prepareCastingApplicationUpload(form: FormData) {
  const client = createClientSupabaseClient();
  if (!client) throw new Error("Uploads are temporarily unavailable.");
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at) throw new Error("Sign in and verify your email before submitting.");
  const prepared = new FormData();
  for (const [key, value] of form) if (typeof value === "string") prepared.append(key, value);
  const photo = form.get("headshot"), resume = form.get("resume");
  // Validate every chosen file before starting either upload.
  if (photo instanceof File && photo.size) {
    const message = castingMediaError("headshotOriginal", photo.size, photo.type);
    if (message) throw new Error(message);
  }
  if (resume instanceof File && resume.size) {
    const message = castingMediaError("resume", resume.size, resume.type);
    if (message) throw new Error(message);
  }
  if (photo instanceof File && photo.size) {
    let saved = uploadedPhotos.get(photo);
    if (saved?.userId !== user.id) saved = undefined;
    if (!saved) {
      const display = await resizeImageFile(photo);
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const base = `${user.id.toLowerCase()}/casting-headshot-${crypto.randomUUID()}`;
      const path = `${base}.jpg`, original = `${base}-source.${extension}`;
      const results = await Promise.all([
        client.storage.from("headshots").upload(path, display, { contentType: "image/jpeg" }),
        client.storage.from("headshots").upload(original, photo, { contentType: photo.type }),
      ]);
      const failed = results.find(result => result.error)?.error;
      if (failed) {
        const created = [path, original].filter((_, index) => !results[index].error);
        if (created.length) await client.storage.from("headshots").remove(created);
        throw new Error(failed.message);
      }
      saved = { userId: user.id, path, original }; uploadedPhotos.set(photo, saved);
    }
    prepared.set("headshotPath", saved.path); prepared.set("headshotOriginalPath", saved.original);
  }
  if (resume instanceof File && resume.size) {
    let saved = uploadedResumes.get(resume);
    if (saved?.userId !== user.id) saved = undefined;
    if (!saved) {
      const path = `${user.id.toLowerCase()}/casting-resume-${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await client.storage.from("resumes").upload(path, resume, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);
      saved = { userId: user.id, path }; uploadedResumes.set(resume, saved);
    }
    prepared.set("resumePath", saved.path);
  }
  return prepared;
}
