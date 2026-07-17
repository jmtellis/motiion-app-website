"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import type { CollectionShareSummary } from "@/lib/talent-buyers/collection-share-types";
import {
  addTalentToCollections,
  deleteCollection,
  duplicateCollection,
  removeTalentFromCollection,
  updateCollection,
  type LibraryCollectionDetail,
  type LibraryTalent,
} from "@/lib/talent-buyers/library";

import { AddTalentModal } from "./AddTalentModal";
import { CollectionFormModal } from "./CollectionFormModal";
import { CollectionShareModal } from "./CollectionShareModal";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { LibrarySharesRail } from "./LibrarySharesRail";
import { LibraryTalentCard } from "./LibraryTalentCard";
import { OverflowMenu } from "./OverflowMenu";
import { PickCollectionModal } from "./PickCollectionModal";
import { SelectionActionBar } from "./SelectionActionBar";

import "./library.css";

export function CollectionDetail({
  collection: initialCollection,
  savedTalent,
  allCollections,
  shares: initialShares,
}: {
  collection: LibraryCollectionDetail;
  savedTalent: LibraryTalent[];
  allCollections: {
    id: string;
    name: string;
    description: string | null;
    talentCount: number;
    createdAt: string;
    updatedAt: string;
    previewAvatars: string[];
  }[];
  shares: CollectionShareSummary[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [collection, setCollection] = useState(initialCollection);
  const [members, setMembers] = useState(initialCollection.members);
  const [shares, setShares] = useState(initialShares);
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setCollection(initialCollection);
    setMembers(initialCollection.members);
  }, [initialCollection]);

  useEffect(() => {
    setShares(initialShares);
  }, [initialShares]);

  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Library", href: "/library" },
      { label: collection.name },
    ],
    revision: `${collection.id}:${collection.name}:${members.length}`,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((person) => {
      const haystack = [person.name, person.location, ...person.styles].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  function toggleSelected(profileId: string) {
    setSelected((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  function handleUpdate(input: { name: string; description: string }) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await updateCollection({
          collectionId: collection.id,
          name: input.name,
          description: input.description,
        });
        if (!result.ok) {
          reject(new Error(result.error ?? "Could not update collection"));
          return;
        }
        setCollection((current) => ({
          ...current,
          name: input.name,
          description: input.description || null,
        }));
        showToast({ message: "Collection updated", variant: "success" });
        router.refresh();
        resolve();
      });
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateCollection(collection.id);
      if (!result.ok || !result.id) {
        showToast({ message: result.error ?? "Could not duplicate", variant: "error" });
        return;
      }
      showToast({ message: "Collection duplicated", variant: "success" });
      router.push(`/library/${result.id}`);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCollection(collection.id);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not delete", variant: "error" });
        return;
      }
      showToast({ message: "Collection deleted", variant: "success" });
      router.push("/library");
    });
  }

  function handleRemove(profileIds: string[]) {
    startTransition(async () => {
      const result = await removeTalentFromCollection({
        collectionId: collection.id,
        profileIds,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not remove", variant: "error" });
        return;
      }
      setMembers((current) => current.filter((member) => !profileIds.includes(member.profileId)));
      setSelected((current) => current.filter((id) => !profileIds.includes(id)));
      setCollection((current) => ({
        ...current,
        talentCount: Math.max(0, current.talentCount - profileIds.length),
      }));
      showToast({ message: "Removed from collection", variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="library-page">
      <div className="library-page__shell">
        <div className="library-page__main">
          <div className="library-collection-detail__header">
            <div className="library-collection-detail__heading">
              <div className="library-collection-detail__title-row">
                <h1 className="library-page__title">{collection.name}</h1>
                <OverflowMenu
                  items={[
                    { label: "Edit collection", onSelect: () => setEditOpen(true) },
                    { label: "Duplicate", onSelect: handleDuplicate },
                    { label: "Delete", onSelect: () => setDeleteOpen(true), danger: true },
                  ]}
                />
              </div>
              {collection.description ? (
                <p className="library-page__description">{collection.description}</p>
              ) : null}
              <p className="library-collection-detail__count">
                {collection.talentCount === 1 ? "1 person" : `${collection.talentCount} people`}
              </p>
            </div>
            <button type="button" className="buyer-chrome-bar__cta" onClick={() => setAddOpen(true)}>
              Add Talent
            </button>
          </div>

          {members.length ? (
            <>
              <div className="library-page__controls">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="library-search"
                  placeholder="Search this collection"
                />
              </div>

              {filtered.length ? (
                <div className="library-talent-grid">
                  {filtered.map((talent) => (
                    <LibraryTalentCard
                      key={talent.profileId}
                      talent={talent}
                      selectable
                      selected={selected.includes(talent.profileId)}
                      onToggleSelect={() => toggleSelected(talent.profileId)}
                      onRemove={() => handleRemove([talent.profileId])}
                    />
                  ))}
                </div>
              ) : (
                <LibraryEmptyState
                  title="No talent found"
                  body="Try another name or clear your filters."
                  primaryLabel="Clear Search"
                  primaryOnClick={() => setQuery("")}
                />
              )}

              <SelectionActionBar
                count={selected.length}
                onClear={() => setSelected([])}
                actions={[
                  {
                    label: "Add to collection",
                    onClick: () => setMoveOpen(true),
                  },
                  {
                    label: "Remove from collection",
                    onClick: () => handleRemove(selected),
                    danger: true,
                  },
                ]}
              />
            </>
          ) : (
            <LibraryEmptyState
              title="This collection is empty"
              body="Add saved talent to start building this collection."
              primaryLabel="Add Talent"
              primaryOnClick={() => setAddOpen(true)}
              secondaryLabel="Browse Talent"
              secondaryHref="/talent"
            />
          )}
        </div>

        <LibrarySharesRail
          shares={shares}
          collectionScoped
          onCreateShare={() => setShareOpen(true)}
        />
      </div>

      <AddTalentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        savedTalent={savedTalent}
        existingProfileIds={new Set(members.map((member) => member.profileId))}
        onAdd={async (profileIds) => {
          const result = await addTalentToCollections({
            profileIds,
            collectionIds: [collection.id],
          });
          if (!result.ok) {
            showToast({ message: result.error ?? "Could not add talent", variant: "error" });
            return;
          }
          const added = savedTalent.filter((person) => profileIds.includes(person.profileId));
          setMembers((current) => {
            const existing = new Set(current.map((member) => member.profileId));
            return [...added.filter((person) => !existing.has(person.profileId)), ...current];
          });
          setCollection((current) => ({
            ...current,
            talentCount: current.talentCount + added.length,
          }));
          showToast({ message: "Talent added", variant: "success" });
          router.refresh();
        }}
      />

      <CollectionFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit collection"
        submitLabel="Save"
        initialName={collection.name}
        initialDescription={collection.description ?? ""}
        onSubmit={handleUpdate}
      />

      <CollectionShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        collections={[collection]}
        lockedCollectionId={collection.id}
        onShareCreated={(share) => {
          setShares((current) => [share, ...current.filter((item) => item.id !== share.id)]);
        }}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete “${collection.name}”?`}
        description="This will delete the collection, but the people inside it will remain saved in your Library."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="bd-btn-secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="buyer-chrome-bar__cta" onClick={handleDelete}>
              Delete Collection
            </button>
          </div>
        }
      >
        <p className="text-sm text-white/50">You can recreate this collection later if needed.</p>
      </Modal>

      <PickCollectionModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        collections={allCollections.filter((item) => item.id !== collection.id)}
        onConfirm={async (collectionIds) => {
          const result = await addTalentToCollections({
            profileIds: selected,
            collectionIds,
          });
          if (!result.ok) {
            showToast({ message: result.error ?? "Could not add to collection", variant: "error" });
            return;
          }
          showToast({ message: "Added to collection", variant: "success" });
          setSelected([]);
          router.refresh();
        }}
      />
    </div>
  );
}
