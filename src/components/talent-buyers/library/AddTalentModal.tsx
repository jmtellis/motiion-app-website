"use client";

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
    if (!selected.length) return;
    setPending(true);
    try {
      await onAdd(selected);
      setSelected([]);
      setQuery("");
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Talent"
      description="Choose from talent you've already saved to your Library."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/45">{selected.length} selected</p>
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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="library-search w-full max-w-none"
          placeholder="Search saved talent"
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
                    disabled={alreadyIn}
                    onChange={() => toggle(person.profileId)}
                  />
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt="" />
                  ) : (
                    <span className="library-add-row__fallback">{person.name.slice(0, 1)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white/90">{person.name}</span>
                    <span className="block truncate text-xs text-white/40">
                      {alreadyIn ? "Already in collection" : person.location || person.styles[0] || "Saved talent"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-white/45">No saved talent match that search.</p>
        )}
      </div>
    </Modal>
  );
}
