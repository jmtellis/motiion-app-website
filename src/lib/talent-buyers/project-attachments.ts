import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { ProjectAttachment } from "@/types/project";

export function parseProjectAttachments(
  config: Record<string, unknown> | null | undefined,
): ProjectAttachment[] {
  const raw = config?.attachments;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ProjectAttachment =>
      Boolean(item) && typeof item === "object" && typeof (item as ProjectAttachment).id === "string",
  );
}

/** Casting projects use casting_configuration.attachments (shared with iOS). */
export function resolveWorkspaceAttachments(project: {
  project_type?: string | null;
  project_configuration?: Record<string, unknown> | null;
  casting_configuration?: Record<string, unknown> | null;
}): ProjectAttachment[] {
  const projectAttachments = parseProjectAttachments(project.project_configuration);
  const castingAttachments = parseProjectAttachments(project.casting_configuration);

  if (getNormalizedProjectType(project.project_type) !== "casting") {
    return projectAttachments;
  }

  if (castingAttachments.length) return castingAttachments;
  // Legacy web uploads lived on project_configuration before the Files tab was aligned with iOS.
  return projectAttachments;
}

export function sanitizeAttachmentFileName(fileName: string, fallbackExtension: string) {
  const trimmed = fileName.trim() || `attachment.${fallbackExtension}`;
  const withoutPath = trimmed.split(/[/\\]/).pop() || trimmed;
  const sanitized = withoutPath.replace(/[^\w.\- ()[\]]+/g, "_").replace(/_+/g, "_");
  if (sanitized.includes(".")) return sanitized;
  return `${sanitized}.${fallbackExtension}`;
}

export function extractStorageObjectFromPublicUrl(
  url: string | null | undefined,
): { bucket: string; path: string } | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  try {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return { bucket: match[1], path: match[2] };
  }
}
