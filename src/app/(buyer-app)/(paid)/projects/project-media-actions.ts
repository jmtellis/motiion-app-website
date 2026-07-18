"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  extractStorageObjectFromPublicUrl,
  sanitizeAttachmentFileName,
} from "@/lib/talent-buyers/project-attachments";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { CastingAttachmentCodable } from "@/types/casting";
import type { ProjectAttachment } from "@/types/project";

const PROJECT_MEDIA_BUCKET = "project-media";
const CASTING_DOCUMENTS_BUCKET = "casting-project-documents";
const MAX_COVER_BYTES = 12 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type UploadProjectCoverResult =
  | { ok: true; publicUrl: string; storagePath: string }
  | { ok: false; error: string };

type UploadProjectAttachmentResult =
  | { ok: true; attachment: CastingAttachmentCodable; storagePath: string }
  | { ok: false; error: string };

type RemoveProjectMediaResult = { ok: true } | { ok: false; error: string };

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

function buildStoragePath(userId: string, draftSessionId: string, segment: string, filename: string) {
  return `${userId.toLowerCase()}/projects/${draftSessionId}/${segment}/${filename}`;
}

function revalidateAttachmentPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath(`/projects/${projectId}/files`);
}

export async function uploadProjectCover(formData: FormData): Promise<UploadProjectCoverResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const file = formData.get("file");
    const draftSessionId = String(formData.get("draftSessionId") ?? "").trim();

    if (!(file instanceof File)) {
      return { ok: false, error: "Choose a cover image to upload." };
    }

    if (!draftSessionId) {
      return { ok: false, error: "Missing upload session." };
    }

    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Cover must be an image file." };
    }

    if (file.size > MAX_COVER_BYTES) {
      return { ok: false, error: "Cover image must be under 12 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = getFileExtension(file, "jpg");
    const contentType = file.type || "image/jpeg";
    const storagePath = buildStoragePath(userId, draftSessionId, "cover", `cover.${ext}`);

    const upload = await supabase.storage.from(PROJECT_MEDIA_BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });

    if (upload.error) {
      return { ok: false, error: upload.error.message };
    }

    const { data: publicUrl } = supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(storagePath);

    return { ok: true, publicUrl: publicUrl.publicUrl, storagePath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cover upload failed.",
    };
  }
}

export async function uploadProjectAttachment(formData: FormData): Promise<UploadProjectAttachmentResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const file = formData.get("file");
    const draftSessionId = String(formData.get("draftSessionId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim() || "Attachment";
    const attachmentId = String(formData.get("attachmentId") ?? "").trim() || crypto.randomUUID();
    const useCastingDocuments = String(formData.get("useCastingDocuments") ?? "") === "1";

    if (!(file instanceof File)) {
      return { ok: false, error: "Choose a file to upload." };
    }

    if (!draftSessionId) {
      return { ok: false, error: "Missing upload session." };
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

    if (!allowedTypes.has(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp|heic|heif)$/i)) {
      return { ok: false, error: "Upload a PDF or image attachment." };
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "Attachment must be under 20 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const ext = isPdf ? "pdf" : getFileExtension(file, "jpg");
    const contentType = isPdf ? "application/pdf" : file.type || "image/jpeg";
    const fileName = sanitizeAttachmentFileName(file.name || `attachment.${ext}`, ext);

    let storagePath: string;
    let bucket: string;

    if (useCastingDocuments) {
      // Match iOS: casting-project-documents / {projectId}/{attachmentId}/{filename}
      bucket = CASTING_DOCUMENTS_BUCKET;
      storagePath = `${draftSessionId.toLowerCase()}/${attachmentId.toLowerCase()}/${fileName}`;
    } else {
      bucket = PROJECT_MEDIA_BUCKET;
      storagePath = buildStoragePath(userId, draftSessionId, "attachments", `${attachmentId}.${ext}`);
    }

    const upload = await supabase.storage.from(bucket).upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });

    if (upload.error) {
      return { ok: false, error: upload.error.message };
    }

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return {
      ok: true,
      storagePath,
      attachment: {
        id: attachmentId,
        title,
        file_url_string: publicUrl.publicUrl,
        file_name: fileName,
        content_type: contentType,
        uploaded_at_iso8601: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Attachment upload failed.",
    };
  }
}

export async function removeProjectMedia(storagePath: string): Promise<RemoveProjectMediaResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const normalizedPath = storagePath.trim();
    const prefix = `${userId.toLowerCase()}/`;

    if (!normalizedPath.startsWith(prefix)) {
      return { ok: false, error: "You can only remove your own uploads." };
    }

    const { error } = await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([normalizedPath]);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to remove file.",
    };
  }
}

export async function removeAttachmentMedia(fileUrl: string | null | undefined): Promise<RemoveProjectMediaResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const extracted = extractStorageObjectFromPublicUrl(fileUrl);
    if (!extracted) return { ok: true };

    if (extracted.bucket === PROJECT_MEDIA_BUCKET) {
      const prefix = `${userId.toLowerCase()}/`;
      if (!extracted.path.startsWith(prefix)) {
        return { ok: false, error: "You can only remove your own uploads." };
      }
      const { error } = await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([extracted.path]);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (extracted.bucket === CASTING_DOCUMENTS_BUCKET) {
      const projectId = extracted.path.split("/")[0];
      if (!projectId) return { ok: false, error: "Invalid attachment path." };

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("poster_id", userId)
        .maybeSingle();

      if (!project) return { ok: false, error: "You can only remove your own uploads." };

      const { error } = await supabase.storage.from(CASTING_DOCUMENTS_BUCKET).remove([extracted.path]);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    return { ok: false, error: "Unsupported attachment storage." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to remove file.",
    };
  }
}

type UpdateProjectAttachmentsResult = { ok: true } | { ok: false; error: string };

function normalizeAttachmentList(attachments: ProjectAttachment[]): ProjectAttachment[] {
  return attachments.map((attachment) => ({
    ...attachment,
    file_name: attachment.file_name?.trim() || attachment.title?.trim() || "attachment",
  }));
}

/** Copy legacy project_configuration attachments into casting_configuration for iOS parity. */
export async function migrateLegacyCastingAttachmentsIfNeeded(
  projectId: string,
): Promise<{ attachments: ProjectAttachment[] }> {
  try {
    const { supabase, userId } = await requireUserId();
    const { data: project } = await supabase
      .from("projects")
      .select("id, project_type, project_configuration, casting_configuration")
      .eq("id", projectId)
      .eq("poster_id", userId)
      .maybeSingle<{
        id: string;
        project_type: string | null;
        project_configuration: Record<string, unknown> | null;
        casting_configuration: Record<string, unknown> | null;
      }>();

    if (!project || getNormalizedProjectType(project.project_type) !== "casting") {
      return { attachments: [] };
    }

    const castingConfig = (project.casting_configuration ?? {}) as Record<string, unknown>;
    const castingAttachments = Array.isArray(castingConfig.attachments)
      ? (castingConfig.attachments as ProjectAttachment[])
      : [];
    if (castingAttachments.length) {
      return { attachments: normalizeAttachmentList(castingAttachments) };
    }

    const projectConfig = (project.project_configuration ?? {}) as Record<string, unknown>;
    const projectAttachments = Array.isArray(projectConfig.attachments)
      ? (projectConfig.attachments as ProjectAttachment[])
      : [];
    if (!projectAttachments.length) {
      return { attachments: [] };
    }

    const normalized = normalizeAttachmentList(projectAttachments);
    await supabase
      .from("projects")
      .update({
        casting_configuration: {
          ...castingConfig,
          attachments: normalized,
        },
      })
      .eq("id", projectId);

    revalidateAttachmentPaths(projectId);
    return { attachments: normalized };
  } catch {
    return { attachments: [] };
  }
}

export async function updateProjectAttachments(
  projectId: string,
  attachments: ProjectAttachment[],
): Promise<UpdateProjectAttachmentsResult> {
  try {
    const { supabase, userId } = await requireUserId();

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, project_type, project_configuration, casting_configuration")
      .eq("id", projectId)
      .eq("poster_id", userId)
      .maybeSingle<{
        id: string;
        project_type: string | null;
        project_configuration: Record<string, unknown> | null;
        casting_configuration: Record<string, unknown> | null;
      }>();

    if (fetchError || !project) {
      return { ok: false, error: "Project not found." };
    }

    const isCasting = getNormalizedProjectType(project.project_type) === "casting";
    const normalizedAttachments = normalizeAttachmentList(attachments);

    if (isCasting) {
      const existingConfig = (project.casting_configuration ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("projects")
        .update({
          casting_configuration: {
            ...existingConfig,
            attachments: normalizedAttachments,
          },
        })
        .eq("id", projectId);

      if (error) return { ok: false, error: error.message };
    } else {
      const existingConfig = (project.project_configuration ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("projects")
        .update({
          project_configuration: {
            ...existingConfig,
            attachments: normalizedAttachments,
          },
        })
        .eq("id", projectId);

      if (error) return { ok: false, error: error.message };
    }

    revalidateAttachmentPaths(projectId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save attachments.",
    };
  }
}
