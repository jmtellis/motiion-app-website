"use client";

import { useEffect, useState, useTransition } from "react";

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
  const [shareDuration, setShareDuration] = useState<ShortlistLinkDuration>("twenty_four_hours");
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCreatedShareUrl(null);
    setShareDuration("twenty_four_hours");
  }, [open, roleIds.join("|"), title]);

  function handleCreateShare() {
    if (!roleIds.length) {
      showToast({ message: "Select a role with shortlisted talent first.", variant: "error" });
      return;
    }
    startTransition(async () => {
      const result = await createRoleShortlistShare({
        roleIds,
        roleTitle: title,
        duration: shareDuration,
      });
      if (!result.ok || !result.share) {
        showToast({ message: result.error ?? "Could not create link", variant: "error" });
        return;
      }
      setCreatedShareUrl(result.share.publicUrl);
      onShareCreated?.(result.share);
      showToast({ message: "Client presentation link created", variant: "success" });
    });
  }

  function handleClose() {
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
        <button type="button" className="btn-primary text-sm" disabled={isPending || !roleIds.length} onClick={handleCreateShare}>
          {isPending ? "Creating…" : "Create link"}
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
