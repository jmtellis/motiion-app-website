"use client";

import { Bookmark, FolderPlus, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveTalentForBuyer } from "@/app/(buyer-app)/(paid)/talent/actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  addTalentToCollections,
  createCollection,
  listCollections,
  type LibraryCollectionSummary,
} from "@/lib/talent-buyers/library";

import "./library.css";

function talentKeys(talentIdOrSlug: string | string[]) {
  return (Array.isArray(talentIdOrSlug) ? talentIdOrSlug : [talentIdOrSlug])
    .map((value) => value.trim())
    .filter(Boolean);
}

export function SaveToCollectionPopover({
  open,
  onClose,
  talentIdOrSlug,
  displayName,
  anchorClassName = "",
  trigger,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  talentIdOrSlug: string | string[];
  displayName: string;
  anchorClassName?: string;
  trigger: React.ReactNode;
  align?: "left" | "right";
}) {
  const { showToast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const [collections, setCollections] = useState<LibraryCollectionSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingTarget, setSavingTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCreating(false);
    setNewName("");
    setSavingTarget(null);
    void listCollections().then((result) => {
      setCollections(result.collections);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  function saveTo(collectionIds: string[], label: string) {
    const keys = talentKeys(talentIdOrSlug);
    if (!keys.length) {
      showToast({ message: "Could not identify this profile.", variant: "error" });
      return;
    }

    const targetKey = collectionIds[0] ?? "library";
    setSavingTarget(targetKey);
    startTransition(async () => {
      const saved = await saveTalentForBuyer(keys);
      if (!saved.ok || !saved.profileId) {
        showToast({ message: saved.error ?? "Could not save talent.", variant: "error" });
        setSavingTarget(null);
        return;
      }

      if (collectionIds.length) {
        const result = await addTalentToCollections({
          profileIds: [saved.profileId],
          collectionIds,
          ensureSaved: true,
        });
        if (!result.ok) {
          showToast({ message: result.error ?? "Could not add to collection.", variant: "error" });
          setSavingTarget(null);
          return;
        }
      }

      showToast({
        message: collectionIds.length ? `${displayName} saved to ${label}` : `${displayName} saved to Library`,
        variant: "success",
      });
      setSavingTarget(null);
      onClose();
    });
  }

  function handleCreateAndSave() {
    const name = newName.trim();
    const keys = talentKeys(talentIdOrSlug);
    if (!name || !keys.length) return;
    setSavingTarget("create");
    startTransition(async () => {
      const created = await createCollection({ name });
      if (!created.ok || !created.id) {
        showToast({ message: created.error ?? "Could not create collection.", variant: "error" });
        setSavingTarget(null);
        return;
      }

      const saved = await saveTalentForBuyer(keys);
      if (!saved.ok || !saved.profileId) {
        showToast({ message: saved.error ?? "Could not save talent.", variant: "error" });
        setSavingTarget(null);
        return;
      }

      const result = await addTalentToCollections({
        profileIds: [saved.profileId],
        collectionIds: [created.id],
        ensureSaved: true,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not add to collection.", variant: "error" });
        setSavingTarget(null);
        return;
      }

      showToast({ message: `${displayName} saved to ${name}`, variant: "success" });
      setSavingTarget(null);
      onClose();
    });
  }

  return (
    <div className={`relative ${anchorClassName}`} ref={rootRef}>
      {trigger}
      {open ? (
        <div
          className={`library-save-popover${align === "left" ? " library-save-popover--left" : ""}`}
          role="dialog"
          aria-label="Save to"
        >
          <p className="text-sm font-semibold text-white/90">Save to</p>
          <p className="mt-0.5 text-xs text-white/45">Library, or pick a collection</p>

          <div className="library-save-popover__list">
            <button
              type="button"
              className="library-save-popover__board"
              disabled={isPending}
              onClick={() => saveTo([], "Library")}
            >
              <span className="library-save-popover__board-thumb library-save-popover__board-thumb--library">
                <Bookmark className="size-3.5" aria-hidden />
              </span>
              <span className="library-save-popover__board-meta">
                <span className="library-save-popover__board-name">All Saved Talent</span>
                <span className="library-save-popover__board-sub">Library</span>
              </span>
              <span className="library-save-popover__board-action">
                {savingTarget === "library" ? "Saving…" : "Save"}
              </span>
            </button>

            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className="library-save-popover__board"
                disabled={isPending}
                onClick={() => saveTo([collection.id], collection.name)}
              >
                <span className="library-save-popover__board-thumb">
                  {collection.previewAvatars[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={collection.previewAvatars[0]} alt="" />
                  ) : (
                    <FolderPlus className="size-3.5 opacity-50" aria-hidden />
                  )}
                </span>
                <span className="library-save-popover__board-meta">
                  <span className="library-save-popover__board-name">{collection.name}</span>
                  <span className="library-save-popover__board-sub">
                    {collection.talentCount === 1 ? "1 person" : `${collection.talentCount} people`}
                  </span>
                </span>
                <span className="library-save-popover__board-action">
                  {savingTarget === collection.id ? "Saving…" : "Save"}
                </span>
              </button>
            ))}
          </div>

          {creating ? (
            <div className="mt-1 flex gap-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="library-search max-w-none flex-1"
                placeholder="Collection name"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateAndSave();
                  }
                }}
              />
              <button
                type="button"
                className="buyer-chrome-bar__cta"
                onClick={() => handleCreateAndSave()}
                disabled={isPending || !newName.trim()}
              >
                {savingTarget === "create" ? "…" : "Create"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="library-save-popover__create"
              onClick={() => setCreating(true)}
              disabled={isPending}
            >
              <Plus className="size-3.5" aria-hidden />
              Create collection
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
