"use client";

import { Bell, Check, ExternalLink, Heart, Link2, ListPlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ProfilePreviewFrame } from "@/components/portfolio/PublicProfilePanel";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { Talent } from "@/lib/talent-navigator/types";
import {
  addToDiscoverList,
  fetchTalentSaveState,
  recordProfileView,
  removeFromDiscoverList,
  toggleFavorite,
  toggleNotifyMe,
  type TalentSaveState,
} from "@/lib/talent/referrer-lists";

const PANEL_ID = "discover-profile-panel";

export function DiscoverProfilePanel({
  talent,
  open,
  onClose,
}: {
  talent: Talent | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<TalentSaveState | null>(null);
  const [busy, setBusy] = useState<"favorite" | "notify" | "list" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !talent) return;
    void recordProfileView(talent.id);
    let cancelled = false;
    void fetchTalentSaveState(talent.id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, talent]);

  const path = talent ? `/profile/${encodeURIComponent(talent.slug)}` : "";
  const reason = talent?.matchReasons?.find((item) => item.evidenceType === "credit") ?? talent?.matchReasons?.[0];

  async function copy() {
    if (!path) return;
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function onFavorite() {
    if (!talent) return;
    setBusy("favorite");
    const result = await toggleFavorite(talent.id);
    setBusy(null);
    setError(result.error);
    if (!result.error) setState((current) => current ? { ...current, favorited: result.favorited } : current);
  }

  async function onNotify() {
    if (!talent) return;
    setBusy("notify");
    const result = await toggleNotifyMe(talent.id);
    setBusy(null);
    setError(result.error);
    if (!result.error) setState((current) => current ? { ...current, notifying: result.notifying } : current);
  }

  async function onToggleList(listId: string, includes: boolean) {
    if (!talent) return;
    setBusy("list");
    const result = includes
      ? await removeFromDiscoverList(listId, talent.id)
      : await addToDiscoverList(listId, talent.id);
    setBusy(null);
    setError(result.error);
    if (!result.error) {
      setState((current) => current ? {
        ...current,
        lists: current.lists.map((list) => list.id === listId ? { ...list, includes: !includes } : list),
      } : current);
    }
  }

  return (
    <WorkspaceSidePanel
      id={PANEL_ID}
      open={open && talent !== null}
      title={talent?.name ?? "Profile"}
      onClose={onClose}
      actions={talent ? (
        <>
          <button type="button" className="workspace-notifications__close" aria-pressed={state?.favorited} aria-label={state?.favorited ? "Remove from favorites" : "Add to favorites"} title="Favorite" disabled={busy === "favorite"} onClick={() => void onFavorite()}>
            <Heart size={16} aria-hidden fill={state?.favorited ? "currentColor" : "none"} />
          </button>
          <button type="button" className="workspace-notifications__close" aria-pressed={state?.notifying} aria-label={state?.notifying ? "Stop notifications" : "Notify me"} title="Notify me" disabled={busy === "notify"} onClick={() => void onNotify()}>
            <Bell size={16} aria-hidden fill={state?.notifying ? "currentColor" : "none"} />
          </button>
          <button type="button" className="workspace-notifications__close" aria-expanded={menuOpen} aria-label="Add to list" title="Add to list" onClick={() => setMenuOpen((current) => !current)}>
            <ListPlus size={16} aria-hidden />
          </button>
          <button type="button" className="workspace-notifications__close" aria-label={copied ? "Link copied" : "Copy profile link"} title="Copy link" onClick={() => void copy()}>
            {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
          </button>
          <a className="workspace-notifications__close" href={path} target="_blank" rel="noopener noreferrer" aria-label="Open public profile in a new tab" title="Open in new tab">
            <ExternalLink size={16} aria-hidden />
          </a>
        </>
      ) : null}
    >
      {talent ? (
        <div className="discover-profile">
          {reason ? <p className="talent-discovery-match">Why this matched: {reason.label}</p> : null}
          {error ? <p className="talent-discovery-match talent-discovery-match--error">{error}</p> : null}
          {menuOpen ? (
            <div className="talent-discovery-list-menu" role="menu" aria-label="Your lists">
              {busy === "list" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              {state?.lists.length ? state.lists.map((list) => (
                <button key={list.id} type="button" role="menuitemcheckbox" aria-checked={list.includes} onClick={() => void onToggleList(list.id, list.includes)}>
                  <span>{list.name}</span>
                  {list.includes ? <Check size={14} aria-hidden /> : null}
                </button>
              )) : <p>No lists yet. Create one from Saved.</p>}
            </div>
          ) : null}
          <ProfilePreviewFrame path={path} />
        </div>
      ) : null}
    </WorkspaceSidePanel>
  );
}
