"use server";

import { extractBreakdownWithVision } from "@/lib/talent-buyers/breakdown-extract";
import type { ExtractedBreakdownData } from "@/lib/talent-buyers/breakdown-types";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProjectAttachment } from "@/types/project";

import { uploadProjectAttachment } from "./project-media-actions";

const MAX_BREAKDOWN_BYTES = 20 * 1024 * 1024;

export type ProcessBreakdownResult =
  | { ok: true; extracted: ExtractedBreakdownData; attachment: ProjectAttachment | null }
  | { ok: false; error: string };

async function assertCastingProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();

  if (projectId) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: false as const, error: "Supabase is not configured." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false as const, error: "You must be signed in to upload a breakdown." };
    }

    const { data: project, error } = await supabase
      .from("projects")
      .select("project_type")
      .eq("id", projectId)
      .eq("poster_id", user.id)
      .maybeSingle<{ project_type: string | null }>();

    if (error || !project) {
      return { ok: false as const, error: "Project not found." };
    }

    if (getNormalizedProjectType(project.project_type) !== "casting") {
      return { ok: false as const, error: "Breakdown upload is only available for casting projects." };
    }

    return { ok: true as const };
  }

  if (getNormalizedProjectType(projectType) !== "casting") {
    return { ok: false as const, error: "Breakdown upload is only available for casting projects." };
  }

  return { ok: true as const };
}

export async function processProjectBreakdown(formData: FormData): Promise<ProcessBreakdownResult> {
  try {
    const castingCheck = await assertCastingProject(formData);
    if (!castingCheck.ok) {
      return castingCheck;
    }

    const sourceFile = formData.get("source");
    const draftSessionId = String(formData.get("draftSessionId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim() || "Breakdown";
    const pageEntries = formData
      .getAll("pages")
      .filter((item): item is File => item instanceof File);

    if (!(sourceFile instanceof File)) {
      return { ok: false, error: "Choose a breakdown file to upload." };
    }

    if (!draftSessionId) {
      return { ok: false, error: "Missing upload session." };
    }

    if (sourceFile.size > MAX_BREAKDOWN_BYTES) {
      return { ok: false, error: "Breakdown must be under 20 MB." };
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);

    if (!allowedTypes.has(sourceFile.type) && !sourceFile.name.match(/\.(pdf|jpe?g|png|webp|heic|heif)$/i)) {
      return { ok: false, error: "Upload a PDF or image breakdown." };
    }

    const sourceBytes = Buffer.from(await sourceFile.arrayBuffer());
    const isPdf = sourceFile.type === "application/pdf" || sourceFile.name.toLowerCase().endsWith(".pdf");

    let pageBuffers: Buffer[];

    if (pageEntries.length) {
      pageBuffers = await Promise.all(
        pageEntries.map(async (page) => Buffer.from(await page.arrayBuffer())),
      );
    } else if (!isPdf) {
      pageBuffers = [sourceBytes];
    } else {
      return {
        ok: false,
        error: "Could not read PDF pages in the browser. Try again or upload a photo of the breakdown.",
      };
    }

    const extracted = await extractBreakdownWithVision(pageBuffers);

    const attachmentFormData = new FormData();
    attachmentFormData.append("file", sourceFile);
    attachmentFormData.append("draftSessionId", draftSessionId);
    attachmentFormData.append("title", title);

    const uploadResult = await uploadProjectAttachment(attachmentFormData);
    const attachment = uploadResult.ok ? uploadResult.attachment : null;

    return { ok: true, extracted, attachment };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Breakdown processing failed.",
    };
  }
}
