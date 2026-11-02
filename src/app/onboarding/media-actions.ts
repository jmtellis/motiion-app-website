"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractResumeWithVision } from "@/lib/onboarding/resume-extract";
import { mergeResumeIntoDraft } from "@/lib/onboarding/merge-resume-into-draft";
import type { ExtractedResumeData } from "@/lib/onboarding/resume-types";
import type { OnboardingDraft } from "@/types/onboarding";
import { isOwnedResumePath, resumePagesError, resumeSourceError } from "@/lib/onboarding/resume-upload";

const HEADSHOTS_BUCKET = "headshots";
const RESUMES_BUCKET = "resumes";
const MAX_HEADSHOTS = 4;
const MAX_HEADSHOT_BYTES = 12 * 1024 * 1024;

type UploadHeadshotsResult =
  | { ok: true; headshotUrls: string[]; headshotOriginalUrls: string[] }
  | { ok: false; error: string };

type ProcessResumeResult =
  | { ok: true; resumeUrl: string; extracted: ExtractedResumeData; draftPatch: Partial<OnboardingDraft> }
  | { ok: false; error: string };

function getFileExtension(file: File, fallback: string) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === "application/pdf") return "pdf";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  return fallback;
}

async function requireUserId() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to upload files.");
  }

  return { supabase, userId: user.id };
}

export async function uploadOnboardingHeadshots(formData: FormData): Promise<UploadHeadshotsResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const entries = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!entries.length) {
      return { ok: false, error: "Choose at least one headshot image." };
    }

    if (entries.length > MAX_HEADSHOTS) {
      return { ok: false, error: `You can upload up to ${MAX_HEADSHOTS} headshots.` };
    }

    const startSlot = Number(formData.get("startSlot") ?? "0");
    const timestamp = Math.floor(Date.now() / 1000);
    const userFolder = userId.toLowerCase();
    const displayUrls: string[] = [];
    const originalUrls: string[] = [];

    for (let index = 0; index < entries.length; index += 1) {
      const slot = startSlot + index;
      const file = entries[index];
      if (!file.type.startsWith("image/")) {
        return { ok: false, error: "Headshots must be image files." };
      }

      if (file.size > MAX_HEADSHOT_BYTES) {
        return { ok: false, error: "Each headshot must be under 12 MB." };
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = getFileExtension(file, "jpg");
      const contentType = file.type || "image/jpeg";
      const displayPath = `${userFolder}/headshot_${slot}_${timestamp}.${ext}`;
      const sourcePath = `${userFolder}/headshot_${slot}_${timestamp}_source.${ext}`;

      const uploadOptions = { contentType, upsert: true };

      const displayUpload = await supabase.storage.from(HEADSHOTS_BUCKET).upload(displayPath, bytes, uploadOptions);
      if (displayUpload.error) {
        return { ok: false, error: displayUpload.error.message };
      }

      const sourceUpload = await supabase.storage.from(HEADSHOTS_BUCKET).upload(sourcePath, bytes, uploadOptions);
      if (sourceUpload.error) {
        return { ok: false, error: sourceUpload.error.message };
      }

      const { data: displayPublic } = supabase.storage.from(HEADSHOTS_BUCKET).getPublicUrl(displayPath);
      const { data: sourcePublic } = supabase.storage.from(HEADSHOTS_BUCKET).getPublicUrl(sourcePath);

      displayUrls.push(displayPublic.publicUrl);
      originalUrls.push(sourcePublic.publicUrl);
    }

    return { ok: true, headshotUrls: displayUrls, headshotOriginalUrls: originalUrls };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Headshot upload failed.",
    };
  }
}

export async function processOnboardingResume(formData: FormData): Promise<ProcessResumeResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const resumePath = formData.get("sourcePath");
    const pageEntries = formData
      .getAll("pages")
      .filter((item): item is File => item instanceof File);

    if (!isOwnedResumePath(resumePath, userId)) {
      return { ok: false, error: "Choose a resume file to upload." };
    }
    const pagesError = resumePagesError(pageEntries);
    if (pagesError) return { ok: false, error: pagesError };
    // Validate actual storage metadata, never the caller's claimed size/MIME.
    const { data: source, error: sourceError } = await supabase.storage.from(RESUMES_BUCKET).info(resumePath);
    if (sourceError || !source) return { ok: false, error: "Couldn’t find your uploaded resume. Please choose the file again." };
    const validationError = resumeSourceError(source.size, source.contentType);
    if (validationError) return { ok: false, error: validationError };

    const { data: publicUrl } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(resumePath);
    const resumeUrl = publicUrl.publicUrl;

    const pageBuffers = await Promise.all(pageEntries.map(async (page) => Buffer.from(await page.arrayBuffer())));

    const extracted = await extractResumeWithVision(pageBuffers);
    const draftPatch = mergeResumeIntoDraft(resumeUrl, extracted);

    try {
      const { extractedResumeToCreditProposals, persistAiExtractedCredits } = await import(
        "@/lib/talent-navigator/resume-credit-extraction"
      );
      const proposals = extractedResumeToCreditProposals(extracted);
      if (proposals.length) {
        await persistAiExtractedCredits(userId, proposals);
      }
    } catch (creditError) {
      console.debug(
        "AI credit proposal persist skipped:",
        creditError instanceof Error ? creditError.message : creditError,
      );
    }

    return { ok: true, resumeUrl, extracted, draftPatch };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Resume processing failed.",
    };
  }
}
