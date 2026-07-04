"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";

import { uploadOnboardingHeadshots } from "@/app/onboarding/media-actions";
import { resizeImageFile } from "@/lib/onboarding/client-media";

const MAX_HEADSHOTS = 4;

export function HeadshotUploadGrid({
  headshotUrls,
  headshotOriginalUrls,
  onUploaded,
  onError,
}: {
  headshotUrls: string[];
  headshotOriginalUrls: string[];
  onUploaded: (urls: { headshotUrls: string[]; headshotOriginalUrls: string[] }) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const filledCount = headshotUrls.length;
  const canAddMore = filledCount < MAX_HEADSHOTS;

  function openPicker() {
    if (!canAddMore || isPending) return;
    inputRef.current?.click();
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const remaining = MAX_HEADSHOTS - filledCount;
    const files = Array.from(fileList).slice(0, remaining).filter((file) => file.type.startsWith("image/"));

    if (!files.length) {
      onError("Choose image files for your headshots.");
      return;
    }

    onError(null);
    startTransition(async () => {
      try {
        const preparedFiles = await Promise.all(
          files.map(async (file) => {
            const blob = await resizeImageFile(file);
            return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            });
          }),
        );

        const formData = new FormData();
        formData.append("startSlot", String(headshotUrls.length));
        for (const file of preparedFiles) {
          formData.append("files", file);
        }

        const result = await uploadOnboardingHeadshots(formData);

        if (!result.ok) {
          onError(result.error);
          return;
        }

        onUploaded({
          headshotUrls: [...headshotUrls, ...result.headshotUrls],
          headshotOriginalUrls: [...headshotOriginalUrls, ...result.headshotOriginalUrls],
        });
      } catch (error) {
        onError(error instanceof Error ? error.message : "Headshot upload failed.");
      }
    });
  }

  function removeRemote(index: number) {
    onUploaded({
      headshotUrls: headshotUrls.filter((_, itemIndex) => itemIndex !== index),
      headshotOriginalUrls: headshotOriginalUrls.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function moveHeadshot(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= headshotUrls.length) return;

    const swap = <T,>(items: T[]) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    };

    onUploaded({
      headshotUrls: swap(headshotUrls),
      headshotOriginalUrls: swap(headshotOriginalUrls),
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {headshotUrls.map((url, index) => (
          <div
            key={url}
            className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--tone)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove headshot"
              onClick={() => removeRemote(index)}
              className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
            {index === 0 ? (
              <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                Primary
              </span>
            ) : null}
            {headshotUrls.length > 1 ? (
              <div className="absolute right-2 bottom-2 left-2 flex justify-between">
                <button
                  type="button"
                  aria-label="Move headshot earlier"
                  disabled={index === 0}
                  onClick={() => moveHeadshot(index, -1)}
                  className="inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Move headshot later"
                  disabled={index === headshotUrls.length - 1}
                  onClick={() => moveHeadshot(index, 1)}
                  className="inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ))}

        {canAddMore ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={isPending}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-white text-sm text-[var(--ink-soft)] transition hover:border-[var(--ink-soft)] hover:bg-[var(--tone)] disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-6 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-6" aria-hidden />
            )}
            <span>{filledCount === 0 ? "Add headshot" : "Add another"}</span>
          </button>
        ) : null}
      </div>

      <p className="text-sm text-[var(--ink-soft)]">
        {filledCount > 0
          ? `${filledCount} of ${MAX_HEADSHOTS} headshots added.`
          : "Add at least one headshot. JPEG or PNG, up to 12 MB each."}
      </p>
    </div>
  );
}
