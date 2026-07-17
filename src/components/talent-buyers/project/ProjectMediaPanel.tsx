"use client";

import { ImagePlus, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  removeProjectMedia,
  uploadProjectAttachment,
  uploadProjectCover,
} from "@/app/(buyer-app)/projects/project-media-actions";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import type { ProjectAttachment } from "@/types/project";

import "./project-create.css";

export function ProjectMediaPanel({
  draftSessionId,
  coverImageUrl,
  coverStoragePath,
  attachments,
  onCoverChange,
  onAttachmentsChange,
  onError,
}: {
  draftSessionId: string;
  coverImageUrl: string;
  coverStoragePath: string | null;
  attachments: ProjectAttachment[];
  onCoverChange: (url: string, storagePath: string | null) => void;
  onAttachmentsChange: (attachments: ProjectAttachment[]) => void;
  onError: (message: string | null) => void;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isCoverPending, startCoverTransition] = useTransition();
  const [isAttachmentPending, startAttachmentTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function openCoverPicker() {
    if (isCoverPending) return;
    coverInputRef.current?.click();
  }

  function handleCoverFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    onError(null);
    startCoverTransition(async () => {
      try {
        const blob = await resizeImageFile(file);
        const prepared = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
          type: "image/jpeg",
        });

        const formData = new FormData();
        formData.append("file", prepared);
        formData.append("draftSessionId", draftSessionId);

        const result = await uploadProjectCover(formData);

        if (!result.ok) {
          onError(result.error);
          return;
        }

        onCoverChange(result.publicUrl, result.storagePath);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Cover upload failed.");
      }
    });
  }

  async function removeCover() {
    onError(null);

    if (coverStoragePath) {
      const result = await removeProjectMedia(coverStoragePath);
      if (!result.ok) {
        onError(result.error);
        return;
      }
    }

    onCoverChange("", null);
  }

  function openAttachmentPicker() {
    if (isAttachmentPending) return;
    attachmentInputRef.current?.click();
  }

  function handleAttachmentFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    onError(null);
    startAttachmentTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("draftSessionId", draftSessionId);
        formData.append("title", file.name);

        const result = await uploadProjectAttachment(formData);

        if (!result.ok) {
          onError(result.error);
          return;
        }

        onAttachmentsChange([...attachments, result.attachment]);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Attachment upload failed.");
      }
    });
  }

  async function removeAttachment(attachment: ProjectAttachment) {
    onError(null);
    setRemovingId(attachment.id);

    const pathMatch = attachment.file_url_string?.match(/project-media\/(.+)$/);
    if (pathMatch?.[1]) {
      await removeProjectMedia(pathMatch[1]);
    }

    onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id));
    setRemovingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="project-create__section-title">Cover image</h2>
        <div
          className={`project-create__cover-drop ${coverImageUrl ? "project-create__cover-drop--has-image" : ""}`}
          onClick={coverImageUrl ? undefined : openCoverPicker}
          onKeyDown={
            coverImageUrl
              ? undefined
              : (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCoverPicker();
                  }
                }
          }
          role={coverImageUrl ? undefined : "button"}
          tabIndex={coverImageUrl ? undefined : 0}
        >
          {coverImageUrl ? (
            <>
              <img src={coverImageUrl} alt="Project cover preview" className="project-create__cover-preview" />
              <div className="project-create__cover-actions">
                <button
                  type="button"
                  className="project-create__cover-btn"
                  onClick={openCoverPicker}
                  disabled={isCoverPending}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="project-create__cover-btn"
                  onClick={removeCover}
                  disabled={isCoverPending}
                  aria-label="Remove cover"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            </>
          ) : (
            <>
              {isCoverPending ? (
                <Loader2 className="size-8 animate-spin text-[#2dd4bf]" aria-hidden />
              ) : (
                <ImagePlus className="size-8 text-[#2dd4bf]" aria-hidden />
              )}
              <p className="text-sm font-medium text-white/85">Upload cover image</p>
              <p className="text-xs text-white/45">JPG, PNG, or WebP up to 12 MB</p>
            </>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            handleCoverFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="project-create__section-title">Attachments</h2>
        <p className="text-sm text-white/50">
          Upload briefs, music, or reference files talent may need for submissions.
        </p>

        {attachments.length ? (
          <ul className="project-create__attachment-list">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="project-create__attachment-item">
                <div className="min-w-0">
                  <p className="project-create__attachment-name">{attachment.title}</p>
                  <p className="project-create__attachment-meta">{attachment.content_type ?? "File"}</p>
                </div>
                <button
                  type="button"
                  className="project-create__cover-btn"
                  onClick={() => removeAttachment(attachment)}
                  disabled={removingId === attachment.id}
                  aria-label={`Remove ${attachment.title}`}
                >
                  {removingId === attachment.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="project-create__add-attachment"
          onClick={openAttachmentPicker}
          disabled={isAttachmentPending}
        >
          {isAttachmentPending ? (
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
    </div>
  );
}
