"use client";

import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { ProLockHint } from "@/components/talent-buyers/billing/ProLockHint";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import "@/components/talent-buyers/billing/upgrade-pro.css";
import {
  createCollection,
  deleteCollection,
  duplicateCollection,
  updateCollection,
  type LibraryCollectionSummary,
} from "@/lib/talent-buyers/library";

import { CollectionCard } from "./CollectionCard";
import { CollectionFormModal } from "./CollectionFormModal";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { SharedRostersSection } from "./SharedRostersSection";

import "./library.css";

export function LibraryPage({
  collections: initialCollections,
  error,
}: {
  collections: LibraryCollectionSummary[];
  error?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { requirePro, hasIndustryPro, openUpgrade } = useIndustryProOptional();
  const [collections, setCollections] = useState(initialCollections);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LibraryCollectionSummary | null>(null);
  const [editMode, setEditMode] = useState<"rename" | "description">("rename");
  const [deleteTarget, setDeleteTarget] = useState<LibraryCollectionSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const mutation = useRef(false);

  const [lastSnapshot, setLastSnapshot] = useState(initialCollections);
  if (lastSnapshot !== initialCollections) {
    setLastSnapshot(initialCollections);
    setCollections(initialCollections);
  }

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    if (!requirePro("roster_write")) return;
    setCreateOpen(true);
  }

  async function handleCreate(input: { name: string; description: string }) {
    if (mutation.current) throw new Error("Another change is still saving.");
    mutation.current = true;
    try {
      const result = await createCollection(input);
      if (!result.ok || !result.id) throw new Error(result.error ?? "Could not create roster");
      showToast({ message: "Roster created", variant: "success" });
      router.push(`/library/${result.id}`);
    } finally { mutation.current = false; }
  }
  async function handleUpdate(input: { name: string; description: string }) {
    if (!editTarget) return;
    if (mutation.current) throw new Error("Another change is still saving.");
    mutation.current = true;
    try {
      const result = await updateCollection({ collectionId: editTarget.id, ...input });
      if (!result.ok) throw new Error(result.error ?? "Could not update roster");
      setCollections(current => current.map(collection => collection.id === editTarget.id ? { ...collection, name: input.name, description: input.description || null } : collection));
      showToast({ message: "Roster updated", variant: "success" });
      setEditTarget(null); refresh();
    } finally { mutation.current = false; }
  }
  function handleDuplicate(collection: LibraryCollectionSummary) {
    if (mutation.current) return;
    mutation.current = true;
    startTransition(async () => {
      try {
        const result = await duplicateCollection(collection.id);
        if (!result.ok || !result.id) throw new Error(result.error ?? "Could not duplicate roster");
        showToast({ message: "Roster duplicated", variant: "success" });
        router.push(`/library/${result.id}`);
      } catch (error) { showToast({ message: error instanceof Error ? error.message : "The connection was interrupted. Please retry.", variant: "error" }); }
      finally { mutation.current = false; }
    });
  }
  function handleDelete() {
    if (!deleteTarget || mutation.current) return;
    mutation.current = true;
    startTransition(async () => {
      try {
        const result = await deleteCollection(deleteTarget.id);
        if (!result.ok) throw new Error(result.error ?? "Could not delete roster");
        setCollections(current => current.filter(collection => collection.id !== deleteTarget.id));
        setDeleteTarget(null); showToast({ message: "Roster deleted", variant: "success" }); refresh();
      } catch (error) { showToast({ message: error instanceof Error ? error.message : "The connection was interrupted. Please retry.", variant: "error" }); }
      finally { mutation.current = false; }
    });
  }

  const createButton = (
    <button type="button" className="buyer-chrome-bar__cta" disabled={pending} onClick={openCreate}>
      <ProLockHint />
      Create roster
    </button>
  );

  return (
    <div className="library-page">
      <div className="library-page__shell">
        <div className="library-page__main">
          <IndustryPageHeader
            eyebrow="Your people"
            title="Roster"
            description="Group the people you want to work with."
            actions={createButton}
          />
          {error ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {error}{" "}
              <button type="button" className="underline" onClick={() => refresh()}>
                Retry
              </button>
            </p>
          ) : null}

          {!hasIndustryPro ? (
            <div className="library-pro-callout">
              <p className="library-pro-callout__title">More with Industry Pro</p>
              <p className="library-pro-callout__copy">
                Free includes Saved Talent and three custom rosters. Upgrade for unlimited rosters
                and sharing with collaborators.{" "}
                <button
                  type="button"
                  className="text-[color-mix(in_oklab,var(--accent)_85%,white)] underline-offset-2 hover:underline"
                  onClick={() => openUpgrade("roster_write")}
                >
                  Explore Industry Pro
                </button>
              </p>
            </div>
          ) : null}

          {collections.length ? (
            <div className="library-collection-grid">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onRename={() => {
                    setEditMode("rename");
                    setEditTarget(collection);
                  }}
                  onEditDescription={() => {
                    setEditMode("description");
                    setEditTarget(collection);
                  }}
                  onDuplicate={() => handleDuplicate(collection)}
                  onDelete={() => setDeleteTarget(collection)}
                />
              ))}
            </div>
          ) : (
            <LibraryEmptyState
              variant="collections"
              title="No rosters yet"
              body="Create a roster to group people you have saved."
              primaryLabel="Discover"
              primaryHref="/talent"
              secondaryLabel="Create roster"
              secondaryOnClick={openCreate}
            />
          )}
          <SharedRostersSection />
        </div>
      </div>

      <CollectionFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New roster"
        submitLabel="Create roster"
        onSubmit={handleCreate}
      />

      <CollectionFormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editMode === "rename" ? "Rename roster" : "Edit description"}
        submitLabel="Save"
        initialName={editTarget?.name ?? ""}
        initialDescription={editTarget?.description ?? ""}
        onSubmit={handleUpdate}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete roster"}
        description="This will delete the roster. People you saved stay on Discover."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="bd-btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button type="button" className="buyer-chrome-bar__cta" disabled={pending} onClick={handleDelete}>
              Delete roster
            </button>
          </div>
        }
      >
        <p className="text-sm text-white/50">You can recreate this roster later if needed.</p>
      </Modal>
    </div>
  );
}
