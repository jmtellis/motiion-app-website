"use client";

import { useRef, useState, useTransition } from "react";

import {
  createRoleShortlistShare,
  type ShortlistLinkDuration,
  type ShortlistShareSummary,
} from "@/lib/talent-buyers/shortlist-shares";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";

export const SHORTLIST_SHARE_DURATIONS: { value: ShortlistLinkDuration; label: string }[] = [
  { value: "two_hours", label: "2 hours" },
  { value: "twenty_four_hours", label: "24 hours" },
  { value: "one_week", label: "1 week" },
  { value: "until_casting_closes", label: "Until casting closes" },
];

type CastingShortlistShareModalProps = {
  open: boolean;
  onClose: () => void;
  roleIds: string[];
  title: string;
  scopeLabel: string;
  onShareCreated?: (share: ShortlistShareSummary) => void;
};

export function CastingShortlistShareModal({
  open,
  onClose,
  roleIds,
  title,
  scopeLabel,
  onShareCreated,
}: CastingShortlistShareModalProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [shareDuration, setShareDuration] = useState<ShortlistLinkDuration>("twenty_four_hours");
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  const resetKey = `${open}:${roleIds.join("|")}:${title}`;
  const [previousKey, setPreviousKey] = useState(resetKey);
  if (previousKey !== resetKey) {
    setPreviousKey(resetKey);
    setCreatedShareUrl(null);
    setError(null);
    setShareDuration("twenty_four_hours");
  }

  function handleCreateShare() {
    if (busy.current || createdShareUrl) return;
    if (!roleIds.length) {
      showToast({ message: "Select a role with shortlisted talent first.", variant: "error" });
      return;
    }
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createRoleShortlistShare({ roleIds, roleTitle: title, duration: shareDuration });
        if (!result.ok || !result.share) throw new Error(result.error ?? "Could not create link.");
        setCreatedShareUrl(result.share.publicUrl);
        onShareCreated?.(result.share);
        showToast({ message: "Client presentation link created", variant: "success" });
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Could not create link. Check your connection and retry.");
      } finally {
        busy.current = false;
      }
    });
  }

  function handleClose() {
    if (busy.current) return;
    setCreatedShareUrl(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Share with client"
      description={`Create a private presentation link for shortlisted talent (${scopeLabel}). Clients can review without a Motiion account.`}
      footer={
        <button type="button" className="btn-primary text-sm" disabled={isPending || !roleIds.length} onClick={createdShareUrl ? handleClose : handleCreateShare}>
          {isPending ? "Creating…" : createdShareUrl ? "Done" : "Create link"}
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--ink-soft)]">
          This link will include shortlisted talent for <strong className="text-[var(--ink)]">{scopeLabel}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {SHORTLIST_SHARE_DURATIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setShareDuration(option.value)}
              disabled={isPending || Boolean(createdShareUrl)}
              aria-pressed={shareDuration === option.value}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                shareDuration === option.value
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--ink-soft)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error ? <p role="alert" className="text-sm text-[var(--ui-danger)]">{error}</p> : null}
        {createdShareUrl ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--tone)] p-3">
            <p className="text-xs font-medium text-[var(--ink-soft)]">Share this link</p>
            <a href={createdShareUrl} className="mt-1 break-all text-sm text-[var(--accent-dark)] hover:underline">
              {createdShareUrl}
            </a>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
