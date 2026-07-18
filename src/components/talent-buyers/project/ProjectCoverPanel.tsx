"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { removeProjectMedia, uploadProjectCover } from "@/app/(buyer-app)/(paid)/projects/project-media-actions";
import { resizeImageFile } from "@/lib/onboarding/client-media";

import "./project-create.css";

export function ProjectCoverPanel({
  draftSessionId,
  coverImageUrl,
  coverStoragePath,
  onCoverChange,
  onError,
}: {
  draftSessionId: string;
  coverImageUrl: string;
  coverStoragePath: string | null;
  onCoverChange: (url: string, storagePath: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isCoverPending, startCoverTransition] = useTransition();

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

  return (
    <div className="space-y-3">
      <h2 className="project-create__section-title">Cover</h2>
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
              <Loader2 className="size-8 animate-spin text-white/60" aria-hidden />
            ) : (
              <ImagePlus className="size-8 text-white/55" aria-hidden />
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
  );
}
