"use client";

import { Copy, Link2, Plus } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { deactivateCollectionShare } from "@/lib/talent-buyers/collection-shares";
import {
  collectionShareDurationLabel,
  type CollectionShareSummary,
} from "@/lib/talent-buyers/collection-share-types";

export function LibrarySharesRail({
  shares: initialShares,
  onCreateShare,
  collectionScoped = false,
}: {
  shares: CollectionShareSummary[];
  onCreateShare: () => void;
  /** When true, cards omit the collection name (already on the detail page). */
  collectionScoped?: boolean;
}) {
  const { showToast } = useToast();
  const [shares, setShares] = useState(initialShares);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [lastSnapshot, setLastSnapshot] = useState(initialShares);
  if (lastSnapshot !== initialShares) {
    setLastSnapshot(initialShares);
    setShares(initialShares);
  }

  function copyLink(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      showToast({ message: "Link copied", variant: "success" });
    }).catch(() => { showToast({ message: "Could not copy. Open the link and copy its address.", variant: "error" }); });
  }

  async function revoke(shareId: string) {
    if (revokingId) return;
    setRevokingId(shareId);
    try {
      const result = await deactivateCollectionShare(shareId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not revoke share", variant: "error" });
        return;
      }
      setShares((current) => current.filter((share) => share.id !== shareId));
      showToast({ message: "Share link revoked", variant: "success" });
    } catch {
      showToast({ message: "Could not revoke this link. Please try again.", variant: "error" });
    } finally { setRevokingId(null); }
  }

  return (
    <aside className="library-shares-rail" aria-label="Shared links">
      <div className="library-shares-rail__header">
        <div>
          <h2 className="library-shares-rail__title">Shared</h2>
          <p className="library-shares-rail__subtitle">
            {collectionScoped ? "Active links for this collection" : "Active collection links"}
          </p>
        </div>
        <button type="button" className="library-shares-rail__add" onClick={onCreateShare} aria-label="Share collection">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>

      <div className="library-shares-rail__body">
        {shares.length ? (
          shares.map((share) => {
            const recipient = share.recipients[0];
            const duration = collectionShareDurationLabel(share.expirationKind, share.expiresAt);
            return (
              <article key={share.id} className="library-share-card">
                <div className="library-share-card__top">
                  <div className="library-share-card__avatars" aria-hidden>
                    {share.recipients.length ? (
                      share.recipients.slice(0, 3).map((person) =>
                        person.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={person.id} src={person.avatarUrl} alt="" />
                        ) : (
                          <span key={person.id} className="library-share-card__avatar-fallback">
                            {(person.displayName || person.email || "?").slice(0, 1).toUpperCase()}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="library-share-card__avatar-fallback">
                        <Link2 className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <span className="library-share-card__duration">{duration}</span>
                </div>

                {!collectionScoped ? (
                  <h3 className="library-share-card__name">{share.title || share.listName}</h3>
                ) : share.title && share.title !== share.listName ? (
                  <h3 className="library-share-card__name">{share.title}</h3>
                ) : null}
                <p className="library-share-card__meta">
                  {recipient?.displayName || recipient?.email || "Open link"}
                  {share.recipients.length > 1 ? ` +${share.recipients.length - 1}` : ""}
                </p>

                <div className="library-share-card__actions">
                  <button type="button" onClick={() => copyLink(share.publicUrl)}>
                    <Copy className="size-3.5" aria-hidden />
                    Copy link
                  </button>
                  <a href={share.publicUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  <button type="button" className="library-share-card__revoke" disabled={Boolean(revokingId)} onClick={() => void revoke(share.id)}>
                    {revokingId === share.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="library-shares-rail__empty">
            <p>No active shares yet.</p>
            <button type="button" className="text-[var(--accent)]" onClick={onCreateShare}>
              Share this collection
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
