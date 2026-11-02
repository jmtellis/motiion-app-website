"use client";

import { Bookmark, FolderPlus, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveTalentForBuyer } from "@/app/(buyer-app)/(paid)/talent/actions";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
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

type SaveProps = {
  open: boolean; onClose: () => void; talentIdOrSlug: string | string[];
  displayName: string; anchorClassName?: string; trigger: React.ReactNode; align?: "left" | "right";
};
export function SaveToCollectionPopover(props: SaveProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, onClose } = props;
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) onClose(); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onClose]);
  return <div className={`relative ${props.anchorClassName ?? ""}`} ref={rootRef}>
    {props.trigger}
    {props.open ? <SaveSession {...props} onClose={() => { props.onClose(); rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }} /> : null}
  </div>;
}
function SaveSession({ onClose, talentIdOrSlug, displayName, align = "right" }: SaveProps) {
  const { showToast } = useToast();
  const { requirePro } = useIndustryProOptional();
  const [collections, setCollections] = useState<LibraryCollectionSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingTarget, setSavingTarget] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);
  useEffect(() => {
    let active = true;
    void listCollections().then(result => {
      if (!active) return;
      setCollections(result.collections); setLoadError(result.error ?? null); setLoading(false);
    }).catch(() => { if (active) { setLoadError("Could not load collections. Please retry."); setLoading(false); } });
    return () => { active = false; };
  }, [retry]);

  function saveTo(collectionIds: string[], label: string) {
    if (isPending) return;
    if (collectionIds.length && !requirePro("roster_write")) return;
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
    if (!requirePro("roster_write")) return;
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
    <div
          ref={panelRef}
          onKeyDown={event => { if (event.key === "Escape" && !isPending) { event.preventDefault(); onClose(); } }}
          className={`library-save-popover${align === "left" ? " library-save-popover--left" : ""}`}
          role="dialog"
          aria-label="Save to"
        >
          <p className="text-sm font-semibold text-[var(--ui-text)]">Save to</p>
          <p className="mt-0.5 text-xs text-[var(--ui-muted)]">Library, or pick a collection</p>

          {loading ? <p role="status" className="text-sm text-[var(--ui-muted)]">Loading collections…</p> : null}
          {loadError ? <div className="ui-notice" data-tone="error" role="alert">{loadError} <button type="button" onClick={() => { setLoading(true); setLoadError(null); setRetry(value => value + 1); }}>Retry</button></div> : null}
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
                aria-label="New collection name"
                maxLength={120}
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
              onClick={() => {
                if (!requirePro("roster_write")) return;
                setCreating(true);
              }}
              disabled={isPending}
            >
              <Plus className="size-3.5" aria-hidden />
              Create collection
            </button>
          )}
    </div>
  );
}
