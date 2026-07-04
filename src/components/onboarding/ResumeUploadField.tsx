"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { processOnboardingResume } from "@/app/onboarding/media-actions";
import { renderPdfPagesToJpegBlobs } from "@/lib/onboarding/client-media";
import type { OnboardingDraft } from "@/types/onboarding";

const RESUME_PHASES = [
  "Uploading resume…",
  "Reading document…",
  "Extracting profile details…",
  "Mapping credits and training…",
] as const;

export function ResumeUploadField({
  resumeUrl,
  onProcessed,
  onError,
}: {
  resumeUrl: string;
  onProcessed: (patch: Partial<OnboardingDraft>) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPicker() {
    if (isPending) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File | null) {
    if (!file) return;

    onError(null);
    setFileName(file.name);
    setPhaseIndex(0);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("source", file);

        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          setPhaseIndex(1);
          const pages = await renderPdfPagesToJpegBlobs(file);
          pages.forEach((page, index) => {
            formData.append("pages", page, `resume_page_${index + 1}.jpg`);
          });
        }

        setPhaseIndex(2);
        const result = await processOnboardingResume(formData);

        if (!result.ok) {
          onError(result.error);
          setFileName(null);
          return;
        }

        setPhaseIndex(3);
        onProcessed({
          resumeUrl: result.resumeUrl,
          ...result.draftPatch,
        });
        onError(null);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Resume upload failed.");
        setFileName(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={isPending}
            className="flex w-full items-center justify-between gap-4 ui-card-interactive px-5 py-4 text-left disabled:opacity-60"
      >
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ink)]">
            {fileName ?? (resumeUrl ? "Resume uploaded" : "Upload resume")}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {isPending
              ? RESUME_PHASES[Math.min(phaseIndex, RESUME_PHASES.length - 1)]
              : resumeUrl
                ? "Upload a new file to replace and re-parse your resume."
                : "PDF or image. We extract profile details and credits like the Motiion app."}
          </p>
        </div>
        {isPending ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-[var(--ink-soft)]" aria-hidden />
        ) : (
          <FileUp className="size-5 shrink-0 text-[var(--ink-soft)]" aria-hidden />
        )}
      </button>

      {resumeUrl && !isPending ? (
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
        >
          View uploaded resume
        </a>
      ) : null}
    </div>
  );
}
