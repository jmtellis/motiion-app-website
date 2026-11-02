"use client";

import { useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";

function CollectionFormModalSession({
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


  async function handleSubmit() {
    if (pending) return;
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
      onClose={() => { if (!pending) onClose(); }}
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
          <span className="text-xs font-medium text-[var(--ui-muted)]">Collection name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="library-search w-full max-w-none"
            placeholder="e.g. Tour Ready"
            aria-invalid={!!error}
            maxLength={120}
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--ui-muted)]">Description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="library-search w-full max-w-none min-h-[5rem] resize-y"
            placeholder="What is this collection for?"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-[var(--ui-danger)]">{error}</p> : null}
      </div>
    </Modal>
  );
}

export function CollectionFormModal(props: Parameters<typeof CollectionFormModalSession>[0]) {
  return props.open ? <CollectionFormModalSession {...props} /> : null;
}
