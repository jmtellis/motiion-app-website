"use server";

import { revalidatePath } from "next/cache";

import { FREE_INBOX_STORAGE_BYTES, formatBytes } from "@/lib/billing/freemium-limits";
import { hasIndustryProAccess } from "@/lib/billing/gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  extractStorageObjectFromPublicUrl,
  sanitizeAttachmentFileName,
} from "@/lib/talent-buyers/project-attachments";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectAttachment } from "@/types/project";

const PROJECT_MEDIA_BUCKET = "project-media";
const CASTING_DOCUMENTS_BUCKET = "casting-project-documents";
const MAX_INBOX_BYTES = 20 * 1024 * 1024;

async function getInboxUsageBytes(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("buyer_file_inbox")
    .select("size_bytes")
    .eq("owner_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (Number(row.size_bytes) || 0), 0);
}

type ActionResult = { ok: true } | { ok: false; error: string };
type UploadInboxResult =
  | { ok: true; file: BuyerInboxFile }
  | { ok: false; error: string };
type ListInboxResult =
  | { ok: true; files: BuyerInboxFile[] }
  | { ok: false; error: string };
type ProjectAttachmentsResult =
  | { ok: true; attachments: ProjectAttachment[]; projectType: string | null }
  | { ok: false; error: string };

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
    throw new Error("You must be signed in to manage files.");
  }

  return { supabase, userId: user.id };
}

function getFileExtension(file: File, fallback: string) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (file.type === "application/pdf") return "pdf";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.startsWith("image/")) return "jpg";
  return fallback;
}

function mapInboxRow(row: {
  id: string;
  owner_id: string;
  title: string;
  file_name: string;
  content_type: string | null;
  file_url: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
}): BuyerInboxFile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    fileName: row.file_name,
    contentType: row.content_type,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function normalizeAttachmentList(attachments: ProjectAttachment[]): ProjectAttachment[] {
  return attachments.map((attachment) => ({
    ...attachment,
    file_name: attachment.file_name?.trim() || attachment.title?.trim() || "attachment",
  }));
}

function revalidateInboxPaths(projectId?: string) {
  revalidatePath("/projects");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/files`);
  }
}

export async function listInboxFiles(): Promise<ListInboxResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const { data, error } = await supabase
      .from("buyer_file_inbox")
      .select(
        "id, owner_id, title, file_name, content_type, file_url, storage_path, size_bytes, created_at",
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, files: (data ?? []).map(mapInboxRow) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load inbox files.",
    };
  }
}

export async function fetchProjectAttachmentsForHub(
  projectId: string,
): Promise<ProjectAttachmentsResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const { data: project, error } = await supabase
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

    if (error || !project) {
      return { ok: false, error: "Project not found." };
    }

    const isCasting = getNormalizedProjectType(project.project_type) === "casting";
    const config = isCasting
      ? ((project.casting_configuration ?? project.project_configuration ?? {}) as Record<
          string,
          unknown
        >)
      : ((project.project_configuration ?? {}) as Record<string, unknown>);
    const raw = Array.isArray(config.attachments) ? (config.attachments as ProjectAttachment[]) : [];

    return {
      ok: true,
      attachments: normalizeAttachmentList(raw),
      projectType: project.project_type,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load project files.",
    };
  }
}

export async function uploadInboxFile(formData: FormData): Promise<UploadInboxResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { ok: false, error: "Choose a file to upload." };
    }

    if (file.size <= 0) {
      return { ok: false, error: "File is empty." };
    }

    if (file.size > MAX_INBOX_BYTES) {
      return { ok: false, error: "File must be under 20 MB." };
    }

    if (!(await hasIndustryProAccess(userId))) {
      const used = await getInboxUsageBytes(supabase, userId);
      if (used + file.size > FREE_INBOX_STORAGE_BYTES) {
        return {
          ok: false,
          error: `Free plans include ${formatBytes(FREE_INBOX_STORAGE_BYTES)} of file storage. Upgrade to Industry Pro for more room.`,
        };
      }
    }

    const fileId = crypto.randomUUID();
    const ext = getFileExtension(file, "bin");
    const fileName = sanitizeAttachmentFileName(file.name || `file.${ext}`, ext);
    const contentType = file.type || "application/octet-stream";
    const storagePath = `${userId.toLowerCase()}/inbox/${fileId}/${fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage.from(PROJECT_MEDIA_BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

    if (upload.error) {
      return { ok: false, error: upload.error.message };
    }

    const { data: publicUrl } = supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(storagePath);
    const title = file.name.trim() || fileName;

    const { data, error } = await supabase
      .from("buyer_file_inbox")
      .insert({
        id: fileId,
        owner_id: userId,
        title,
        file_name: fileName,
        content_type: contentType,
        file_url: publicUrl.publicUrl,
        storage_path: storagePath,
        size_bytes: file.size,
      })
      .select(
        "id, owner_id, title, file_name, content_type, file_url, storage_path, size_bytes, created_at",
      )
      .single();

    if (error || !data) {
      await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([storagePath]);
      return { ok: false, error: error?.message ?? "Could not save inbox file." };
    }

    revalidateInboxPaths();
    return { ok: true, file: mapInboxRow(data) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Inbox upload failed.",
    };
  }
}

export async function deleteInboxFile(fileId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const { data: row, error: fetchError } = await supabase
      .from("buyer_file_inbox")
      .select("id, storage_path")
      .eq("id", fileId)
      .eq("owner_id", userId)
      .maybeSingle<{ id: string; storage_path: string }>();

    if (fetchError || !row) {
      return { ok: false, error: "File not found." };
    }

    const { error: deleteError } = await supabase
      .from("buyer_file_inbox")
      .delete()
      .eq("id", fileId)
      .eq("owner_id", userId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([row.storage_path]);
    revalidateInboxPaths();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete file.",
    };
  }
}

export async function assignInboxFileToProject(
  fileId: string,
  projectId: string,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUserId();

    const { data: inboxFile, error: inboxError } = await supabase
      .from("buyer_file_inbox")
      .select(
        "id, owner_id, title, file_name, content_type, file_url, storage_path, size_bytes, created_at",
      )
      .eq("id", fileId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (inboxError || !inboxFile) {
      return { ok: false, error: "File not found." };
    }

    const { data: project, error: projectError } = await supabase
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

    if (projectError || !project) {
      return { ok: false, error: "Project not found." };
    }

    const isCasting = getNormalizedProjectType(project.project_type) === "casting";
    let attachmentUrl = inboxFile.file_url as string;
    let attachmentFileName = inboxFile.file_name as string;
    let attachmentContentType = (inboxFile.content_type as string | null) ?? "application/octet-stream";

    if (isCasting) {
      const extracted = extractStorageObjectFromPublicUrl(inboxFile.file_url);
      const sourcePath = extracted?.path ?? (inboxFile.storage_path as string);
      const destPath = `${projectId.toLowerCase()}/${inboxFile.id.toLowerCase()}/${attachmentFileName}`;

      const { data: blob, error: downloadError } = await supabase.storage
        .from(PROJECT_MEDIA_BUCKET)
        .download(sourcePath);

      if (downloadError || !blob) {
        return { ok: false, error: downloadError?.message ?? "Could not copy file for casting." };
      }

      const bytes = Buffer.from(await blob.arrayBuffer());
      const upload = await supabase.storage.from(CASTING_DOCUMENTS_BUCKET).upload(destPath, bytes, {
        contentType: attachmentContentType,
        upsert: true,
      });

      if (upload.error) {
        return { ok: false, error: upload.error.message };
      }

      const { data: publicUrl } = supabase.storage
        .from(CASTING_DOCUMENTS_BUCKET)
        .getPublicUrl(destPath);
      attachmentUrl = publicUrl.publicUrl;

      await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([sourcePath]);
    }

    const attachment: ProjectAttachment = {
      id: inboxFile.id as string,
      title: (inboxFile.title as string) || attachmentFileName,
      file_url_string: attachmentUrl,
      file_name: attachmentFileName,
      content_type: attachmentContentType,
      uploaded_at_iso8601: (inboxFile.created_at as string) || new Date().toISOString(),
    };

    if (isCasting) {
      const existingConfig = (project.casting_configuration ?? {}) as Record<string, unknown>;
      const existing = Array.isArray(existingConfig.attachments)
        ? (existingConfig.attachments as ProjectAttachment[])
        : [];
      const { error } = await supabase
        .from("projects")
        .update({
          casting_configuration: {
            ...existingConfig,
            attachments: normalizeAttachmentList([...existing, attachment]),
          },
        })
        .eq("id", projectId);

      if (error) return { ok: false, error: error.message };
    } else {
      const existingConfig = (project.project_configuration ?? {}) as Record<string, unknown>;
      const existing = Array.isArray(existingConfig.attachments)
        ? (existingConfig.attachments as ProjectAttachment[])
        : [];
      const { error } = await supabase
        .from("projects")
        .update({
          project_configuration: {
            ...existingConfig,
            attachments: normalizeAttachmentList([...existing, attachment]),
          },
        })
        .eq("id", projectId);

      if (error) return { ok: false, error: error.message };
    }

    const { error: deleteError } = await supabase
      .from("buyer_file_inbox")
      .delete()
      .eq("id", fileId)
      .eq("owner_id", userId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    revalidateInboxPaths(projectId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not assign file.",
    };
  }
}
