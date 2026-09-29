"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Rows3, Search } from "lucide-react";

import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  addTalentToCollections,
  type LibraryCollectionSummary,
  type LibraryTalent,
} from "@/lib/talent-buyers/library";

import { LibraryEmptyState } from "./LibraryEmptyState";
import { LibraryTalentCard } from "./LibraryTalentCard";
import { LibraryTalentTable } from "./LibraryTalentTable";
import { PickCollectionModal } from "./PickCollectionModal";
import { SelectionActionBar } from "./SelectionActionBar";

import "./library.css";

type BrowseLayout = "grid" | "table";

const BROWSE_LAYOUT_KEY = "library-browse-layout";

export function SavedTalentView({
  talent: initialTalent,
  collections,
  onDiscover,
}: {
  talent: LibraryTalent[];
  collections: LibraryCollectionSummary[];
  onDiscover?: () => void;
}) {
  const { showToast } = useToast();
  const [talent, setTalent] = useState(initialTalent);
  const [pickCollectionOpen, setPickCollectionOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [browseLayout, setBrowseLayout] = useState<BrowseLayout>("grid");

  useEffect(() => {
    setTalent(initialTalent);
  }, [initialTalent]);

  useEffect(() => {
    const stored = window.localStorage.getItem(BROWSE_LAYOUT_KEY);
    if (stored === "grid" || stored === "table") setBrowseLayout(stored);
  }, []);

  function setBrowseLayoutAndPersist(next: BrowseLayout) {
    setBrowseLayout(next);
    window.localStorage.setItem(BROWSE_LAYOUT_KEY, next);
  }

  const filtered = useMemo(() => {
    let rows = [...talent];
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
  }, [talent, query, collectionFilter, sort, collections]);

  function toggleSelected(profileId: string) {
    setSelected((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  return (
    <div className="space-y-4">
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

      {filtered.length ? (
        browseLayout === "table" ? (
          <LibraryTalentTable
            talent={filtered}
            selected={selected}
            onToggleSelect={toggleSelected}
            onToggleSelectAll={() => {
              const allSelected = filtered.every((person) => selected.includes(person.profileId));
              setSelected(allSelected ? [] : filtered.map((person) => person.profileId));
            }}
          />
        ) : (
          <div className="library-talent-grid">
            {filtered.map((person) => (
              <LibraryTalentCard
                key={person.profileId}
                talent={person}
                selectable
                selected={selected.includes(person.profileId)}
                onToggleSelect={() => toggleSelected(person.profileId)}
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
          body="Save people while you browse or discover, then come back to them here."
          primaryLabel="Discover talent"
          primaryOnClick={onDiscover}
        />
      )}

      <SelectionActionBar
        count={selected.length}
        onClear={() => setSelected([])}
        actions={[{ label: "Add to roster", onClick: () => setPickCollectionOpen(true) }]}
      />

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
          setTalent((current) =>
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
        }}
      />
    </div>
  );
}
