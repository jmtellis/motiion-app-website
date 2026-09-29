"use client";

import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { useEffect, useState, useTransition } from "react";
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
  const [, startTransition] = useTransition();

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    if (!requirePro("roster_write")) return;
    setCreateOpen(true);
  }

  function handleCreate(input: { name: string; description: string }) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await createCollection(input);
        if (!result.ok || !result.id) {
          reject(new Error(result.error ?? "Could not create roster"));
          return;
        }
        showToast({ message: "Roster created", variant: "success" });
        router.push(`/library/${result.id}`);
        resolve();
      });
    });
  }

  function handleUpdate(input: { name: string; description: string }) {
    if (!editTarget) return;
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await updateCollection({
          collectionId: editTarget.id,
          name: input.name,
          description: input.description,
        });
        if (!result.ok) {
          reject(new Error(result.error ?? "Could not update roster"));
          return;
        }
        setCollections((current) =>
          current.map((collection) =>
            collection.id === editTarget.id
              ? { ...collection, name: input.name, description: input.description || null }
              : collection,
          ),
        );
        showToast({ message: "Roster updated", variant: "success" });
        setEditTarget(null);
        refresh();
        resolve();
      });
    });
  }

  function handleDuplicate(collection: LibraryCollectionSummary) {
    startTransition(async () => {
      const result = await duplicateCollection(collection.id);
      if (!result.ok || !result.id) {
        showToast({ message: result.error ?? "Could not duplicate roster", variant: "error" });
        return;
      }
      showToast({ message: "Roster duplicated", variant: "success" });
      router.push(`/library/${result.id}`);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCollection(deleteTarget.id);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not delete roster", variant: "error" });
        return;
      }
      setCollections((current) => current.filter((collection) => collection.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast({ message: "Roster deleted", variant: "success" });
      refresh();
    });
  }

  const createButton = (
    <button type="button" className="buyer-chrome-bar__cta" onClick={openCreate}>
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
              <p className="library-pro-callout__title">Rosters are an Industry Pro feature</p>
              <p className="library-pro-callout__copy">
                Save talent for free from Discover. Upgrade to create named rosters, organize
                collections, and share lists with collaborators.{" "}
                <button
                  type="button"
                  className="text-[color-mix(in_oklab,var(--accent)_85%,white)] underline-offset-2 hover:underline"
                  onClick={() => openUpgrade("roster_write")}
                >
                  Start free trial
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
            <button type="button" className="buyer-chrome-bar__cta" onClick={handleDelete}>
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
