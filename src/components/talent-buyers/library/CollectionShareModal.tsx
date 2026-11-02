"use client";

import { useState, useTransition } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { createCollectionShare } from "@/lib/talent-buyers/collection-shares";
import {
  COLLECTION_SHARE_DURATIONS,
  type CollectionShareDuration,
  type CollectionShareSummary,
} from "@/lib/talent-buyers/collection-share-types";
import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";

function CollectionShareModalSession({
  open,
  onClose,
  collections,
  lockedCollectionId,
  onShareCreated,
}: {
  open: boolean;
  onClose: () => void;
  collections: LibraryCollectionSummary[];
  /** When set, shares this collection only and hides the collection picker. */
  lockedCollectionId?: string;
  onShareCreated?: (share: CollectionShareSummary) => void;
}) {
  const { showToast } = useToast();
  const { requirePro } = useIndustryProOptional();
  const [isPending, startTransition] = useTransition();
  const [collectionId, setCollectionId] = useState(lockedCollectionId || collections[0]?.id || "");
  const [duration, setDuration] = useState<CollectionShareDuration>("twenty_four_hours");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);


  function handleCreate() {
    if (isPending || createdUrl) return;
    if (!requirePro("roster_write")) return;
    if (!collectionId) {
      showToast({ message: "Create a collection before sharing.", variant: "error" });
      return;
    }
    startTransition(async () => {
      const result = await createCollectionShare({
        collectionId,
        duration,
        recipients: recipientName.trim()
          ? [{ displayName: recipientName.trim(), email: recipientEmail.trim() || undefined }]
          : [],
      });
      if (!result.ok || !result.share) {
        showToast({ message: result.error ?? "Could not create share link", variant: "error" });
        return;
      }
      setCreatedUrl(result.share.publicUrl);
      onShareCreated?.(result.share);
      showToast({ message: "Share link created", variant: "success" });
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!isPending) onClose(); }}
      title="Share collection"
      description="Anyone with the link can review this collection until it expires or you revoke it. Recipient details are labels; no email is sent."
      size="md"
      footer={
        <button
          type="button"
          className="buyer-chrome-bar__cta"
          disabled={isPending || !!createdUrl || !collectionId}
          onClick={handleCreate}
        >
          {createdUrl ? "Link created" : isPending ? "Creating…" : "Create link"}
        </button>
      }
    >
      <div className="space-y-4">
        {!lockedCollectionId ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--ui-muted)]">Collection</span>
            <select
              className="library-select w-full"
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--ui-muted)]">Link duration</p>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_SHARE_DURATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={duration === option.value}
                onClick={() => setDuration(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  duration === option.value
                    ? "border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"
                    : "border-[var(--ui-border)] text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--ui-muted)]">Shared with (optional)</span>
            <input
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              className="library-search w-full max-w-none"
              placeholder="Name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--ui-muted)]">Email (optional)</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              className="library-search w-full max-w-none"
              placeholder="email@example.com"
            />
          </label>
        </div>

        {createdUrl ? (
          <div className="ui-notice ui-notice--success">
            <p className="text-xs font-medium text-[var(--ui-muted)]">Share this link</p>
            <a href={createdUrl} className="mt-1 block break-all text-sm text-[var(--accent)] hover:underline">
              {createdUrl}
            </a>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-[var(--ui-accent)] hover:underline"
              onClick={async () => {
                try { await navigator.clipboard.writeText(createdUrl); showToast({ message: "Link copied", variant: "success" }); }
                catch { showToast({ message: "Could not copy. Select and copy the link above.", variant: "error" }); }
              }}
            >
              Copy link
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function CollectionShareModal(props: Parameters<typeof CollectionShareModalSession>[0]) {
  return props.open ? <CollectionShareModalSession {...props} /> : null;
}
