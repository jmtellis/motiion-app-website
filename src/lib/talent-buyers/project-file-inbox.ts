import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractStorageObjectFromPublicUrl } from "@/lib/talent-buyers/project-attachments";
import { resolveWorkspaceProjectType } from "@/lib/talent-buyers/project-abilities";
import { normalizeProjectContract } from "@/lib/talent-buyers/project-contract";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { ProjectAttachment } from "@/types/project";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type ActionResult = { ok: true } | { ok: false; error: string };
const PROJECT_MEDIA_BUCKET = "project-media";
const CASTING_DOCUMENTS_BUCKET = "casting-project-documents";
function normalizeAttachmentList(attachments: ProjectAttachment[]): ProjectAttachment[] {
  return attachments.map((attachment) => ({ ...attachment, file_name: attachment.file_name?.trim() || attachment.title?.trim() || "attachment" }));
}

/** Authenticated owner-scoped file assignment. Keep the source until metadata is durable. */
export async function assignOwnedInboxFileToProject(
  supabase: SupabaseClient,
  userId: string,
  fileId: string,
  projectId: string,
): Promise<ActionResult> {
  try {
    const { data: inboxFile, error: inboxError } = await supabase
      .from("buyer_file_inbox")
      .select(
        "id, owner_id, title, file_name, content_type, file_url, storage_path, size_bytes, created_at",
      )
      .eq("id", fileId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (inboxError) return { ok: false, error: "Could not load the original file. Please retry." };

    const { data: project, error: projectError } = await supabase
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

    if (projectError || !project) {
      return { ok: false, error: "Project not found." };
    }

    const isCasting = getNormalizedProjectType(resolveWorkspaceProjectType(normalizeProjectContract(project))) === "casting";
    if (!inboxFile) {
      const configuration = (isCasting ? project.casting_configuration : project.project_configuration) ?? {};
      const attachments = Array.isArray(configuration.attachments) ? configuration.attachments as ProjectAttachment[] : [];
      // A timed-out successful request can be retried without adding a duplicate
      // or reporting a missing original that was deliberately moved.
      return attachments.some((attachment) => attachment.id === fileId)
        ? { ok: true }
        : { ok: false, error: "File not found." };
    }
    let attachmentUrl = inboxFile.file_url as string;
    const attachmentFileName = inboxFile.file_name as string;
    const attachmentContentType = (inboxFile.content_type as string | null) ?? "application/octet-stream";

    let copiedSourcePath: string | null = null;
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

      copiedSourcePath = sourcePath;
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
      const update = supabase
        .from("projects")
        .update({
          updated_at: new Date().toISOString(),
          casting_configuration: {
            ...existingConfig,
            attachments: normalizeAttachmentList([...existing.filter((item) => item.id !== attachment.id), attachment]),
          },
        })
        .eq("id", projectId);
      const result = await (project.updated_at ? update.eq("updated_at", project.updated_at) : update.is("updated_at", null)).select("id").maybeSingle();
      if (result.error || !result.data) return { ok: false, error: "The project changed while this file was being assigned. Your original is safe; refresh and retry." };
    } else {
      const existingConfig = (project.project_configuration ?? {}) as Record<string, unknown>;
      const existing = Array.isArray(existingConfig.attachments)
        ? (existingConfig.attachments as ProjectAttachment[])
        : [];
      const update = supabase
        .from("projects")
        .update({
          updated_at: new Date().toISOString(),
          project_configuration: {
            ...existingConfig,
            attachments: normalizeAttachmentList([...existing.filter((item) => item.id !== attachment.id), attachment]),
          },
        })
        .eq("id", projectId);
      const result = await (project.updated_at ? update.eq("updated_at", project.updated_at) : update.is("updated_at", null)).select("id").maybeSingle();
      if (result.error || !result.data) return { ok: false, error: "The project changed while this file was being assigned. Your original is safe; refresh and retry." };
    }

    const { error: deleteError } = await supabase
      .from("buyer_file_inbox")
      .delete()
      .eq("id", fileId)
      .eq("owner_id", userId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    // Keep the original until both the destination metadata and inbox removal
    // succeed. A retry deduplicates the attachment ID instead of adding a copy.
    if (copiedSourcePath) await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove([copiedSourcePath]);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not assign file.",
    };
  }
}
