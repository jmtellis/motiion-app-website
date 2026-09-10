"use client";

import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  removeAttachmentMedia,
  updateProjectAttachments,
  uploadProjectAttachment,
} from "@/app/(buyer-app)/(paid)/projects/project-media-actions";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { ProjectAttachment } from "@/types/project";

import { useToast } from "../dashboard/ToastProvider";
import { ProjectAttachmentThumbnail } from "./ProjectAttachmentThumbnail";

import "./project-create.css";
import "./project-workspace.css";

export function ProjectAttachmentsManager({
  projectId,
  projectType,
  initialAttachments,
  description = "Upload posters, agreements, briefs, or other files for this project.",
  emptyTitle = "No files yet",
  emptyDescription = "Add posters, agreements, or other project files.",
}: {
  projectId: string;
  projectType?: string | null;
  initialAttachments: ProjectAttachment[];
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [isUploadPending, startUploadTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const isCasting = getNormalizedProjectType(projectType) === "casting";

  function persistAttachments(next: ProjectAttachment[]) {
    startSaveTransition(async () => {
      const result = await updateProjectAttachments(projectId, next);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not save attachments.", variant: "error" });
        return;
      }
      setAttachments(next);
      router.refresh();
    });
  }

  function openAttachmentPicker() {
    if (isUploadPending) return;
    attachmentInputRef.current?.click();
  }

  function handleAttachmentFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("draftSessionId", projectId);
        formData.append("title", file.name);
        if (isCasting) {
          formData.append("useCastingDocuments", "1");
        }

        const result = await uploadProjectAttachment(formData);
        if (!result.ok) {
          showToast({ message: result.error, variant: "error" });
          return;
        }

        persistAttachments([...attachments, result.attachment]);
      } catch (error) {
        showToast({
          message: error instanceof Error ? error.message : "Attachment upload failed.",
          variant: "error",
        });
      }
    });
  }

  async function removeAttachment(attachment: ProjectAttachment) {
    setRemovingId(attachment.id);

    await removeAttachmentMedia(attachment.file_url_string);

    const next = attachments.filter((item) => item.id !== attachment.id);
    persistAttachments(next);
    setRemovingId(null);
  }

  return (
    <div className="space-y-3">
      {description ? <p className="text-sm text-white/50">{description}</p> : null}

      {attachments.length ? (
        <ul className="project-create__attachment-list project-create__attachment-list--grid">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="project-create__attachment-item">
              <div className="project-create__attachment-media">
                {attachment.file_url_string ? (
                  <a
                    href={attachment.file_url_string}
                    target="_blank"
                    rel="noreferrer"
                    className="project-create__attachment-preview"
                    aria-label={`Open ${attachment.title}`}
                  >
                    <ProjectAttachmentThumbnail
                      url={attachment.file_url_string}
                      contentType={attachment.content_type}
                      fileName={attachment.file_name ?? attachment.title}
                      title={attachment.title}
                      className="project-attachment-thumb--card"
                    />
                  </a>
                ) : (
                  <div className="project-create__attachment-preview">
                    <ProjectAttachmentThumbnail
                      url={attachment.file_url_string}
                      contentType={attachment.content_type}
                      fileName={attachment.file_name ?? attachment.title}
                      title={attachment.title}
                      className="project-attachment-thumb--card"
                    />
                  </div>
                )}
                <button
                  type="button"
                  className={`project-create__attachment-remove${
                    removingId === attachment.id ? " project-create__attachment-remove--busy" : ""
                  }`}
                  onClick={() => removeAttachment(attachment)}
                  disabled={removingId === attachment.id || isSaving}
                  aria-label={`Remove ${attachment.title}`}
                >
                  {removingId === attachment.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
              <div className="project-create__attachment-copy">
                <p className="project-create__attachment-name">{attachment.title}</p>
                <p className="project-create__attachment-meta">
                  {attachment.file_name ?? attachment.content_type ?? "File"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="project-workspace__empty">
          <p className="project-workspace__empty-title">{emptyTitle}</p>
          <p className="project-workspace__empty-text">{emptyDescription}</p>
        </div>
      )}

      <button
        type="button"
        className="project-create__add-attachment"
        onClick={openAttachmentPicker}
        disabled={isUploadPending || isSaving}
      >
        {isUploadPending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Paperclip className="size-3.5" aria-hidden />
        )}
        Add attachment
      </button>

      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          handleAttachmentFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
