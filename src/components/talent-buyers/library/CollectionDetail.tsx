"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionProfilePanel } from "./CollectionProfilePanel";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { RosterMosaic } from "@/components/talent-buyers/project/composable/RosterStackTile";
import { collectionStackTransitionName } from "@/components/talent-buyers/project/composable/view-transition";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { MOSAIC_COUNT } from "@/lib/talent-buyers/roster-stack";
import type { CollectionShareSummary } from "@/lib/talent-buyers/collection-share-types";
import {
  addTalentToCollections,
  deleteCollection,
  duplicateCollection,
  removeTalentFromCollection,
  updateCollection,
  type LibraryCollectionDetail,
  type LibraryCollectionSummary,
  type LibraryTalent,
} from "@/lib/talent-buyers/library";

import { AddTalentModal } from "./AddTalentModal";
import { CollectionFormModal } from "./CollectionFormModal";
import { CollectionShareModal } from "./CollectionShareModal";
import { RosterAccessButton } from "./RosterAccessButton";
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
  loadError,
}: {
  collection: LibraryCollectionDetail;
  savedTalent: LibraryTalent[];
  allCollections: LibraryCollectionSummary[];
  shares: CollectionShareSummary[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inspectedSlug = searchParams.get("profile");
  const { showToast } = useToast();
  const { requirePro } = useIndustryProOptional();
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
  const [pending, startTransition] = useTransition();

  function inspectProfile(slug: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("profile", slug);
    const state = { motiionCollectionPanel: collection.id };
    if (inspectedSlug) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
  }
  function closeProfile() {
    if (window.history.state?.motiionCollectionPanel === collection.id) { window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete("profile");
    window.history.replaceState(null, "", url);
  }

  const [lastSnapshot, setLastSnapshot] = useState(initialCollection);
  if (lastSnapshot !== initialCollection) {
    setLastSnapshot(initialCollection);
    setCollection(initialCollection);
    setMembers(initialCollection.members);
  }

  const [lastShares, setLastShares] = useState(initialShares);
  if (lastShares !== initialShares) {
    setLastShares(initialShares);
    setShares(initialShares);
  }

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
        try {
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
        } catch { reject(new Error("The connection was interrupted. Your edits are still here; please try again.")); }
      });
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      try {
      const result = await duplicateCollection(collection.id);
      if (!result.ok || !result.id) {
        showToast({ message: result.error ?? "Could not duplicate", variant: "error" });
        return;
      }
      showToast({ message: "Collection duplicated", variant: "success" });
      router.push(`/library/${result.id}`);
      } catch { showToast({ message: "The connection was interrupted. Please try again.", variant: "error" }); }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
      const result = await deleteCollection(collection.id);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not delete", variant: "error" });
        return;
      }
      showToast({ message: "Collection deleted", variant: "success" });
      router.push("/library");
      } catch { showToast({ message: "The connection was interrupted. Please try again.", variant: "error" }); }
    });
  }

  function handleRemove(profileIds: string[]) {
    if (pending) return;
    startTransition(async () => {
      try {
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
      } catch { showToast({ message: "The connection was interrupted. Please try again.", variant: "error" }); }
    });
  }

  return (
    <div className="library-page">
      <div className="library-page__shell">
        <div className="library-page__main">
          {loadError ? <div className="ui-notice" data-tone="error" role="alert">Some roster tools could not load. {loadError} <button type="button" className="ui-button ui-button--secondary" onClick={() => router.refresh()}>Try again</button></div> : null}
          <div className="library-collection-detail__header">
            <RosterMosaic
              people={members.slice(0, MOSAIC_COUNT).map((member) => ({
                id: member.profileId,
                name: member.name,
                avatarUrl: member.avatarUrl,
              }))}
              transitionName={collectionStackTransitionName(collection.id)}
              size="lg"
            />
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
            <div className="flex flex-wrap gap-2">
            <RosterAccessButton listId={collection.id} listName={collection.name} />
            <a className="bd-btn-secondary" href={`/api/rosters/${collection.id}/export?format=xlsx`}>Export Excel</a>
            <a className="bd-btn-secondary" href={`/api/rosters/${collection.id}/export?format=pdf`}>Export PDF</a>
            <button type="button" className="buyer-chrome-bar__cta" onClick={() => setAddOpen(true)} disabled={pending || Boolean(loadError)}>
              Add Talent
            </button>
            </div>
          </div>

          {members.length ? (
            <>
              <div className="library-page__controls">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="library-search"
                  placeholder="Search this collection"
                  aria-label="Search this collection"
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
                      onInspect={() => inspectProfile(talent.userId || talent.slug || talent.profileId)}
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
                    onClick: () => { if (!loadError) setMoveOpen(true); },
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
              variant="talent"
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
          onCreateShare={() => {
            if (!requirePro("roster_write")) return;
            if (!loadError) setShareOpen(true);
          }}
        />
      </div>

      <CollectionProfilePanel slug={inspectedSlug} userId={members.find(member => [member.slug, member.profileId, member.userId].includes(inspectedSlug))?.userId ?? undefined} onClose={closeProfile} />

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
            throw new Error(result.error ?? "Could not add talent");
          }
          const added = savedTalent.filter((person) => profileIds.includes(person.profileId));
          setMembers((current) => {
            const existing = new Set(current.map((member) => member.profileId));
            return [...added.filter((person) => !existing.has(person.profileId)), ...current];
          });
          setCollection((current) => ({
            ...current,
            talentCount: members.length + added.filter((person) => !members.some((member) => member.profileId === person.profileId)).length,
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
        alert
        onClose={() => { if (!pending) setDeleteOpen(false); }}
        title={`Delete “${collection.name}”?`}
        description="This permanently deletes the roster and its share links. Saved talent and project rosters stay in place."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="bd-btn-secondary" onClick={() => setDeleteOpen(false)}>
              Keep roster
            </button>
            <button type="button" className="ui-button ui-button--danger" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting…" : "Delete collection"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--ui-muted)]">This cannot be undone. Export a copy before deleting if you may need it later.</p>
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
            throw new Error(result.error ?? "Could not add to collection");
          }
          showToast({ message: "Added to collection", variant: "success" });
          setSelected([]);
          router.refresh();
        }}
      />
    </div>
  );
}
