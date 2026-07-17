"use client";

import { useEffect, useState, useTransition } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { createCollectionShare } from "@/lib/talent-buyers/collection-shares";
import {
  COLLECTION_SHARE_DURATIONS,
  type CollectionShareDuration,
  type CollectionShareSummary,
} from "@/lib/talent-buyers/collection-share-types";
import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";

export function CollectionShareModal({
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
  const [isPending, startTransition] = useTransition();
  const [collectionId, setCollectionId] = useState(lockedCollectionId || collections[0]?.id || "");
  const [duration, setDuration] = useState<CollectionShareDuration>("twenty_four_hours");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCreatedUrl(null);
    setDuration("twenty_four_hours");
    setRecipientName("");
    setRecipientEmail("");
    setCollectionId(lockedCollectionId || collections[0]?.id || "");
  }, [open, collections, lockedCollectionId]);

  function handleCreate() {
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
      onClose={onClose}
      title="Share collection"
      description="Create a private link to let someone review this collection."
      size="md"
      footer={
        <button
          type="button"
          className="buyer-chrome-bar__cta"
          disabled={isPending || !collectionId}
          onClick={handleCreate}
        >
          {isPending ? "Creating…" : "Create link"}
        </button>
      }
    >
      <div className="space-y-4">
        {!lockedCollectionId ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/55">Collection</span>
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
          <p className="mb-2 text-xs font-medium text-white/55">Link duration</p>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_SHARE_DURATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  duration === option.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/12 text-white"
                    : "border-white/10 text-white/55 hover:text-white/85"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/55">Shared with (optional)</span>
            <input
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              className="library-search w-full max-w-none"
              placeholder="Name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/55">Email (optional)</span>
            <input
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              className="library-search w-full max-w-none"
              placeholder="email@example.com"
            />
          </label>
        </div>

        {createdUrl ? (
          <div className="rounded-xl border border-white/10 bg-white/4 p-3">
            <p className="text-xs font-medium text-white/45">Share this link</p>
            <a href={createdUrl} className="mt-1 block break-all text-sm text-[var(--accent)] hover:underline">
              {createdUrl}
            </a>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-white/70 hover:text-white"
              onClick={() => {
                void navigator.clipboard.writeText(createdUrl);
                showToast({ message: "Link copied", variant: "success" });
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
