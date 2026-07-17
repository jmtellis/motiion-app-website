"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  addTalentToCollections,
  createCollection,
  deleteCollection,
  duplicateCollection,
  updateCollection,
  type LibraryCollectionSummary,
  type LibraryTalent,
} from "@/lib/talent-buyers/library";

import { CollectionCard } from "./CollectionCard";
import { CollectionFormModal } from "./CollectionFormModal";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { LibraryTalentCard } from "./LibraryTalentCard";
import { PickCollectionModal } from "./PickCollectionModal";
import { SelectionActionBar } from "./SelectionActionBar";

import "./library.css";

type LibraryView = "collections" | "saved";

export function LibraryPage({
  collections: initialCollections,
  savedTalent: initialSavedTalent,
  initialView = "collections",
  error,
}: {
  collections: LibraryCollectionSummary[];
  savedTalent: LibraryTalent[];
  initialView?: LibraryView;
  error?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [view, setView] = useState<LibraryView>(initialView);
  const [collections, setCollections] = useState(initialCollections);
  const [savedTalent, setSavedTalent] = useState(initialSavedTalent);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LibraryCollectionSummary | null>(null);
  const [editMode, setEditMode] = useState<"rename" | "description">("rename");
  const [deleteTarget, setDeleteTarget] = useState<LibraryCollectionSummary | null>(null);
  const [pickCollectionOpen, setPickCollectionOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);

  useEffect(() => {
    setSavedTalent(initialSavedTalent);
  }, [initialSavedTalent]);

  const filteredSaved = useMemo(() => {
    let rows = [...savedTalent];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((person) => {
        const collectionNames = collections
          .filter((collection) => person.collectionIds.includes(collection.id))
          .map((collection) => collection.name)
          .join(" ");
        const haystack = [person.name, person.location, collectionNames, ...person.styles]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (collectionFilter !== "all") {
      rows = rows.filter((person) => person.collectionIds.includes(collectionFilter));
    }
    if (sort === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      rows.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
    return rows;
  }, [savedTalent, query, collectionFilter, sort, collections]);

  function refresh() {
    router.refresh();
  }

  function handleCreate(input: { name: string; description: string }) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await createCollection(input);
        if (!result.ok || !result.id) {
          reject(new Error(result.error ?? "Could not create collection"));
          return;
        }
        showToast({ message: "Collection created", variant: "success" });
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
          reject(new Error(result.error ?? "Could not update collection"));
          return;
        }
        setCollections((current) =>
          current.map((collection) =>
            collection.id === editTarget.id
              ? { ...collection, name: input.name, description: input.description || null }
              : collection,
          ),
        );
        showToast({ message: "Collection updated", variant: "success" });
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
        showToast({ message: result.error ?? "Could not duplicate collection", variant: "error" });
        return;
      }
      showToast({ message: "Collection duplicated", variant: "success" });
      router.push(`/library/${result.id}`);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCollection(deleteTarget.id);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not delete collection", variant: "error" });
        return;
      }
      setCollections((current) => current.filter((collection) => collection.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast({ message: "Collection deleted", variant: "success" });
      refresh();
    });
  }

  function toggleSelected(profileId: string) {
    setSelected((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  const libraryIsEmpty = !collections.length && !savedTalent.length;

  return (
    <div className="library-page">
      <div className="library-page__shell">
        <div className="library-page__main">
          {error ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {error}{" "}
              <button type="button" className="underline" onClick={() => refresh()}>
                Retry
              </button>
            </p>
          ) : null}

          {libraryIsEmpty ? (
            <LibraryEmptyState
              title="Build your talent library"
              body="Save people you want to remember, organize them into collections, and return to them when the right opportunity comes up."
              primaryLabel="Find Talent"
              primaryHref="/talent"
              secondaryLabel="Create Collection"
              secondaryOnClick={() => setCreateOpen(true)}
            />
          ) : (
            <>
              <div className="library-page__toolbar">
                <div className="library-page__view-toggle">
                  <SegmentedControl
                    ariaLabel="Library views"
                    value={view}
                    onChange={setView}
                    options={[
                      { value: "collections", label: "Collections" },
                      { value: "saved", label: "All Saved Talent" },
                    ]}
                  />
                </div>
                <div className="library-page__toolbar-end">
                  <button type="button" className="buyer-chrome-bar__cta" onClick={() => setCreateOpen(true)}>
                    New Collection
                  </button>
                </div>
              </div>

              {view === "collections" ? (
                collections.length ? (
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
                    title="No collections yet"
                    body="Create a collection to start grouping saved talent visually."
                    primaryLabel="Create Collection"
                    primaryOnClick={() => setCreateOpen(true)}
                    secondaryLabel="Browse Saved Talent"
                    secondaryOnClick={() => setView("saved")}
                  />
                )
              ) : (
                <div className="space-y-4">
                  <div className="library-page__controls">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="library-search"
                      placeholder="Search saved talent"
                    />
                    <select
                      className="library-select"
                      value={collectionFilter}
                      onChange={(event) => setCollectionFilter(event.target.value)}
                      aria-label="Filter by collection"
                    >
                      <option value="all">All collections</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="library-select"
                      value={sort}
                      onChange={(event) => setSort(event.target.value as "recent" | "name")}
                      aria-label="Sort saved talent"
                    >
                      <option value="recent">Recently saved</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </div>

                  {filteredSaved.length ? (
                    <div className="library-talent-grid">
                      {filteredSaved.map((talent) => (
                        <LibraryTalentCard
                          key={talent.profileId}
                          talent={talent}
                          selectable
                          selected={selected.includes(talent.profileId)}
                          onToggleSelect={() => toggleSelected(talent.profileId)}
                          savedIndicator
                        />
                      ))}
                    </div>
                  ) : query || collectionFilter !== "all" ? (
                    <LibraryEmptyState
                      title="No talent found"
                      body="Try another name or clear your filters."
                      primaryLabel="Clear Search"
                      primaryOnClick={() => {
                        setQuery("");
                        setCollectionFilter("all");
                      }}
                    />
                  ) : (
                    <LibraryEmptyState
                      title="No saved talent yet"
                      body="Save people from Talent Search to start building your library."
                      primaryLabel="Find Talent"
                      primaryHref="/talent"
                    />
                  )}

                  <SelectionActionBar
                    count={selected.length}
                    onClear={() => setSelected([])}
                    actions={[
                      {
                        label: "Add to collection",
                        onClick: () => setPickCollectionOpen(true),
                      },
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CollectionFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Collection"
        submitLabel="Create Collection"
        onSubmit={handleCreate}
      />

      <CollectionFormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editMode === "rename" ? "Rename collection" : "Edit description"}
        submitLabel="Save"
        initialName={editTarget?.name ?? ""}
        initialDescription={editTarget?.description ?? ""}
        onSubmit={handleUpdate}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete collection"}
        description="This will delete the collection, but the people inside it will remain saved in your Library."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="bd-btn-secondary" onClick={() => setDeleteTarget(null)}>
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
        open={pickCollectionOpen}
        onClose={() => setPickCollectionOpen(false)}
        collections={collections}
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
          setSavedTalent((current) =>
            current.map((person) =>
              selected.includes(person.profileId)
                ? {
                    ...person,
                    collectionIds: Array.from(new Set([...person.collectionIds, ...collectionIds])),
                  }
                : person,
            ),
          );
          setSelected([]);
          refresh();
        }}
      />
    </div>
  );
}
