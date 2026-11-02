"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import type { LibraryTalent } from "@/lib/talent-buyers/library";

export function AddTalentModal({
  open,
  onClose,
  savedTalent,
  existingProfileIds,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  savedTalent: LibraryTalent[];
  existingProfileIds: Set<string>;
  onAdd: (profileIds: string[]) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedTalent;
    return savedTalent.filter((person) => {
      const haystack = [person.name, person.location, ...person.styles].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, savedTalent]);

  function toggle(profileId: string) {
    if (existingProfileIds.has(profileId)) return;
    setSelected((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  async function handleAdd() {
    if (!selected.length || pending) return;
    setPending(true);
    setError(null);
    try {
      await onAdd(selected);
      setSelected([]);
      setQuery("");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add talent. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!pending) onClose(); }}
      title="Add Talent"
      description="Choose from talent you've already saved to your Library."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--ui-muted)]">{selected.length} selected</p>
          <div className="flex gap-2">
            <button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              className="buyer-chrome-bar__cta"
              onClick={() => void handleAdd()}
              disabled={pending || !selected.length}
            >
              {pending ? "Adding…" : "Add to Collection"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? <p className="ui-notice" data-tone="error" role="alert">{error}</p> : null}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="library-search w-full max-w-none"
          placeholder="Search saved talent"
          aria-label="Search saved talent"
        />
        {filtered.length ? (
          <div className="library-add-list">
            {filtered.map((person) => {
              const alreadyIn = existingProfileIds.has(person.profileId);
              const isSelected = alreadyIn || selected.includes(person.profileId);
              return (
                <label key={person.profileId} className="library-add-row">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={alreadyIn || pending}
                    onChange={() => toggle(person.profileId)}
                  />
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="library-add-row__fallback">{person.name.slice(0, 1)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--ui-text)]">{person.name}</span>
                    <span className="block truncate text-xs text-[var(--ui-muted)]">
                      {alreadyIn ? "Already in collection" : person.location || person.styles[0] || "Saved talent"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 py-6 text-center text-sm text-[var(--ui-muted)]">
            <p>{savedTalent.length ? "No saved talent match that search." : "Save talent from Discover to start building this roster."}</p>
            {savedTalent.length ? <button type="button" className="bd-btn-secondary" onClick={() => setQuery("")}>Clear search</button> : <Link className="bd-btn-secondary" href="/talent">Discover talent</Link>}
          </div>
        )}
      </div>
    </Modal>
  );
}
