"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, Rows3 } from "lucide-react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { ProChip } from "@/components/talent-buyers/billing/ProChip";
import { ProLockHint } from "@/components/talent-buyers/billing/ProLockHint";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import "@/components/talent-buyers/billing/upgrade-pro.css";
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
import { LibraryTalentTable } from "./LibraryTalentTable";
import { PickCollectionModal } from "./PickCollectionModal";
import { SelectionActionBar } from "./SelectionActionBar";

import "./library.css";

type LibraryView = "collections" | "saved";
type BrowseLayout = "grid" | "table";

const BROWSE_LAYOUT_KEY = "library-browse-layout";

export function LibraryPage({
  collections: initialCollections,
  savedTalent: initialSavedTalent,
  initialView = "saved",
  error,
}: {
  collections: LibraryCollectionSummary[];
  savedTalent: LibraryTalent[];
  initialView?: LibraryView;
  error?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { requirePro, hasIndustryPro, openUpgrade } = useIndustryProOptional();
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
  const [browseLayout, setBrowseLayout] = useState<BrowseLayout>("grid");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);

  useEffect(() => {
    setSavedTalent(initialSavedTalent);
  }, [initialSavedTalent]);

  useEffect(() => {
    const stored = window.localStorage.getItem(BROWSE_LAYOUT_KEY);
    if (stored === "grid" || stored === "table") {
      setBrowseLayout(stored);
    }
  }, []);

  function setBrowseLayoutAndPersist(next: BrowseLayout) {
    setBrowseLayout(next);
    window.localStorage.setItem(BROWSE_LAYOUT_KEY, next);
  }

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

  function toggleSelected(profileId: string) {
    setSelected((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  const libraryIsEmpty = !collections.length && !savedTalent.length;

  const browseControls = (
    <div className="library-page__controls">
      <label className="library-search-wrap">
        <Search className="library-search-wrap__icon" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="library-search"
          placeholder="Search talent"
        />
      </label>
      <select
        className="library-select"
        value={collectionFilter}
        onChange={(event) => setCollectionFilter(event.target.value)}
        aria-label="Filter by roster"
      >
        <option value="all">All rosters</option>
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
        <option value="recent">Recent</option>
        <option value="name">A–Z</option>
      </select>
      <div className="library-layout-toggle" role="group" aria-label="Browse layout">
        <button
          type="button"
          className={`library-layout-toggle__btn${browseLayout === "grid" ? " library-layout-toggle__btn--active" : ""}`}
          aria-pressed={browseLayout === "grid"}
          aria-label="Picture grid"
          onClick={() => setBrowseLayoutAndPersist("grid")}
        >
          <LayoutGrid className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={`library-layout-toggle__btn${browseLayout === "table" ? " library-layout-toggle__btn--active" : ""}`}
          aria-pressed={browseLayout === "table"}
          aria-label="Table view"
          onClick={() => setBrowseLayoutAndPersist("table")}
        >
          <Rows3 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );

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
              variant="collections"
              title="Build your roster"
              body="Save people you want to remember, organize them into rosters, and return to them when the right opportunity comes up."
              primaryLabel="Find Talent"
              primaryHref="/talent"
              secondaryLabel="Create roster"
              secondaryOnClick={() => {
                if (!requirePro("roster_write")) return;
                setCreateOpen(true);
              }}
            />
          ) : (
            <>
              <div className="library-page__mode-row">
                <SegmentedControl
                  ariaLabel="Library views"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "saved", label: "Browse" },
                    {
                      value: "collections",
                      label: "Roster",
                      badge: !hasIndustryPro ? (
                        <ProChip tone={view === "collections" ? "on-active" : "accent"} />
                      ) : undefined,
                    },
                  ]}
                  equalWidth
                  activeTone="white"
                />
              </div>

              {view === "collections" && !hasIndustryPro ? (
                <div className="library-pro-callout">
                  <p className="library-pro-callout__title">Rosters are an Industry Pro feature</p>
                  <p className="library-pro-callout__copy">
                    Save talent for free from Find Talent. Upgrade to create named rosters, organize
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

              <div className="library-page__title-row">
                <h1 className="library-page__title-heading">
                  {view === "saved" ? "Saved Talent" : "Roster"}
                </h1>
                <div className="library-page__title-end">
                  {view === "saved"
                    ? browseControls
                    : collections.length ? (
                        <button
                          type="button"
                          className="buyer-chrome-bar__cta"
                          onClick={() => {
                            if (!requirePro("roster_write")) return;
                            setCreateOpen(true);
                          }}
                        >
                          <ProLockHint />
                          Create roster
                        </button>
                      ) : null}
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
                    variant="collections"
                    title="No rosters yet"
                    body="Create a roster to start grouping saved talent visually."
                    primaryLabel="Create roster"
                    primaryOnClick={() => {
                      if (!requirePro("roster_write")) return;
                      setCreateOpen(true);
                    }}
                  />
                )
              ) : (
                <div className="space-y-4">
                  {filteredSaved.length ? (
                    browseLayout === "table" ? (
                      <LibraryTalentTable
                        talent={filteredSaved}
                        selected={selected}
                        onToggleSelect={toggleSelected}
                        onToggleSelectAll={() => {
                          const allSelected = filteredSaved.every((person) =>
                            selected.includes(person.profileId),
                          );
                          setSelected(
                            allSelected ? [] : filteredSaved.map((person) => person.profileId),
                          );
                        }}
                      />
                    ) : (
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
                    )
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
                      variant="talent"
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
                        label: "Add to roster",
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
        description="This will delete the roster, but the people inside it will remain saved in your Library."
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
            showToast({ message: result.error ?? "Could not add to roster", variant: "error" });
            return;
          }
          showToast({ message: "Added to roster", variant: "success" });
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
