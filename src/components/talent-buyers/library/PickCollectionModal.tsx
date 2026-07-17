"use client";

import { useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";

export function PickCollectionModal({
  open,
  onClose,
  collections,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  collections: LibraryCollectionSummary[];
  onConfirm: (collectionIds: string[]) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function handleConfirm() {
    if (!selected.length) return;
    setPending(true);
    try {
      await onConfirm(selected);
      setSelected([]);
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to collection"
      description="Choose one or more collections."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="buyer-chrome-bar__cta"
            onClick={() => void handleConfirm()}
            disabled={pending || !selected.length}
          >
            {pending ? "Adding…" : "Add to Collection"}
          </button>
        </div>
      }
    >
      <div className="library-save-popover__list max-h-72">
        {collections.map((collection) => (
          <label key={collection.id} className="library-save-popover__row">
            <input
              type="checkbox"
              checked={selected.includes(collection.id)}
              onChange={() => toggle(collection.id)}
            />
            <span className="truncate">{collection.name}</span>
          </label>
        ))}
        {!collections.length ? (
          <p className="px-1 py-3 text-sm text-white/45">Create a collection first.</p>
        ) : null}
      </div>
    </Modal>
  );
}
