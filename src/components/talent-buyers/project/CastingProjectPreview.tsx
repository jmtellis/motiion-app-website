"use client";

import { CalendarClock, ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState, useTransition, type MouseEvent } from "react";

import { removeProjectMedia, uploadProjectCover } from "@/app/(buyer-app)/projects/project-media-actions";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import type { CastingComposerForm } from "@/types/casting";

function formatSubmissionDeadline(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function CastingProjectPreview({
  form,
  draftSessionId,
  coverStoragePath,
  onCoverChange,
  onError,
}: {
  form: CastingComposerForm;
  draftSessionId?: string;
  coverStoragePath?: string | null;
  onCoverChange?: (url: string, storagePath: string | null) => void;
  onError?: (message: string | null) => void;
}) {
  const title = form.title.trim() || "Untitled Casting";
  const roles = form.roles.map((role) => role.title.trim()).filter(Boolean);
  const deadline = formatSubmissionDeadline(form.configuration.submission_deadline_iso8601);
  const canUpload = Boolean(draftSessionId && onCoverChange && onError);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isCoverPending, startCoverTransition] = useTransition();

  function openCoverPicker() {
    if (!canUpload || isCoverPending) return;
    coverInputRef.current?.click();
  }

  function handleCoverFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !draftSessionId || !onCoverChange || !onError) return;

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

  async function removeCover(event: MouseEvent) {
    event.stopPropagation();
    if (!onCoverChange || !onError) return;
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

  return (
    <article className="casting-project-preview" aria-label="Casting preview">
      <div
        className={`casting-project-preview__cover ${
          form.coverImageUrl ? "casting-project-preview__cover--has-image" : "casting-project-preview__cover--empty"
        } ${canUpload ? "casting-project-preview__cover--interactive" : ""}`}
        style={form.coverImageUrl ? { backgroundImage: `url(${form.coverImageUrl})` } : undefined}
        onClick={canUpload ? openCoverPicker : undefined}
        onKeyDown={
          canUpload
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCoverPicker();
                }
              }
            : undefined
        }
        role={canUpload ? "button" : undefined}
        tabIndex={canUpload ? 0 : undefined}
        aria-label={canUpload ? (form.coverImageUrl ? "Change cover image" : "Upload cover image") : undefined}
      >
        {form.coverImageUrl ? (
          <>
            {canUpload ? (
              <div className="casting-project-preview__cover-actions">
                <button
                  type="button"
                  className="casting-project-preview__cover-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    openCoverPicker();
                  }}
                  disabled={isCoverPending}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="casting-project-preview__cover-btn"
                  onClick={removeCover}
                  disabled={isCoverPending}
                  aria-label="Remove cover"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="casting-project-preview__cover-empty-content">
            {isCoverPending ? (
              <Loader2 className="size-7 animate-spin text-white/60" aria-hidden />
            ) : canUpload ? (
              <ImagePlus className="size-7 text-white/55" aria-hidden />
            ) : null}
            <span>{canUpload ? "Upload Cover Image" : "Cover Image"}</span>
            {canUpload ? <span className="casting-project-preview__cover-hint">JPG, PNG, or WebP</span> : null}
          </div>
        )}
      </div>

      {canUpload ? (
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
      ) : null}

      <div className="casting-project-preview__content">
        <p className="casting-project-preview__eyebrow">Casting Preview</p>
        <h2 className="casting-project-preview__title">{title}</h2>

        <div className="casting-project-preview__section">
          <p className="casting-project-preview__label">Roles</p>
          {roles.length > 0 ? (
            <ul className="casting-project-preview__roles">
              {roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          ) : (
            <p className="casting-project-preview__placeholder">Add roles as you build your casting</p>
          )}
        </div>

        <div className="casting-project-preview__section">
          <p className="casting-project-preview__label">Submission Deadline</p>
          {deadline ? (
            <p className="casting-project-preview__deadline">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              <span>{deadline}</span>
            </p>
          ) : (
            <p className="casting-project-preview__placeholder">Set a deadline in Schedule</p>
          )}
        </div>
      </div>
    </article>
  );
}
