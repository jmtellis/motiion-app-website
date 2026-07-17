"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";

export function CollectionFormModal({
  open,
  onClose,
  title,
  submitLabel,
  initialName = "",
  initialDescription = "",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialDescription?: string;
  onSubmit: (input: { name: string; description: string }) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription);
    setError(null);
    setPending(false);
  }, [open, initialName, initialDescription]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Collection name is required");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({ name: trimmed, description: description.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="buyer-chrome-bar__cta" onClick={() => void handleSubmit()} disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">Collection name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="library-search w-full max-w-none"
            placeholder="e.g. Tour Ready"
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">Description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="library-search w-full max-w-none min-h-[5rem] resize-y"
            placeholder="What is this collection for?"
          />
        </label>
        {error ? <p className="text-sm text-amber-200">{error}</p> : null}
      </div>
    </Modal>
  );
}
