"use server";

import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { revalidatePath } from "next/cache";

import { FREE_INBOX_STORAGE_BYTES, formatBytes } from "@/lib/billing/freemium-limits";
import { hasIndustryProAccess } from "@/lib/billing/gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  sanitizeAttachmentFileName,
} from "@/lib/talent-buyers/project-attachments";
import { resolveWorkspaceProjectType } from "@/lib/talent-buyers/project-abilities";
import { assignOwnedInboxFileToProject } from "@/lib/talent-buyers/project-file-inbox";
import { normalizeProjectContract } from "@/lib/talent-buyers/project-contract";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectAttachment } from "@/types/project";

const PROJECT_MEDIA_BUCKET = "project-media";
const MAX_INBOX_BYTES = 20 * 1024 * 1024;

async function getInboxUsageBytes(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<number> {
  const { data, error } = await readPagedRows((from, to) => supabase.from("buyer_file_inbox").select("size_bytes").eq("owner_id", userId).order("id").range(from, to));
  if (error) throw new Error("Could not check your file storage. Please retry.");
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

  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) throw new Error(approval.error);
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
    const { data, error } = await readPagedRows((from, to) => supabase
      .from("buyer_file_inbox")
      .select(
        "id, owner_id, title, file_name, content_type, file_url, storage_path, size_bytes, created_at",
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }).order("id").range(from, to));

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
      .select("id, updated_at, is_composable, project_abilities(ability), project_type, enabled_modules, project_configuration, casting_configuration")
      .eq("id", projectId)
      .eq("poster_id", userId)
      .maybeSingle<{
        id: string;
        updated_at: string | null;
        is_composable: boolean;
        project_abilities: { ability: string }[];
        project_type: string | null;
        enabled_modules: unknown;
        project_configuration: Record<string, unknown> | null;
        casting_configuration: Record<string, unknown> | null;
      }>();

    if (error || !project) {
      return { ok: false, error: "Project not found." };
    }

    const workspaceProject = normalizeProjectContract(project);
    const isCasting = getNormalizedProjectType(resolveWorkspaceProjectType(workspaceProject)) === "casting";
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
      projectType: resolveWorkspaceProjectType(workspaceProject),
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

export async function assignInboxFileToProject(fileId: string, projectId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const result = await assignOwnedInboxFileToProject(supabase, userId, fileId, projectId);
    if (result.ok) revalidateInboxPaths(projectId);
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not assign file." };
  }
}
