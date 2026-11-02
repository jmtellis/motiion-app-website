"use client";

import { Bell, ChevronLeft, ChevronRight, Heart, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { SharedRostersSection } from "@/components/talent-buyers/library/SharedRostersSection";
import { RosterAccessButton } from "@/components/talent-buyers/library/RosterAccessButton";
import { TalentProfileSheet, type TalentProfileChrome } from "@/components/app/talent-profile/TalentProfileSheet";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  listSavedTalent,
  removeTalentFromCollection,
  updateCollection,
  type LibraryTalent,
} from "@/lib/talent-buyers/library";
import type { Talent } from "@/lib/talent-navigator/types";
import {
  createDiscoverList,
  deleteDiscoverList,
  fetchReferrerDiscoverListMembers,
  fetchReferrerDiscoverLists,
  fetchReferrerFavorites,
  fetchReferrerFollowing,
  fetchSharedWithMeLists,
  removeFromDiscoverList,
  renameDiscoverList,
  type ReferrerListSummary,
} from "@/lib/talent/referrer-lists";

type SavedTab = "mine" | "shared";
type SavedCollection =
  | { kind: "favorites" }
  | { kind: "notify" }
  | { kind: "list"; id: string; name: string; owned: boolean };

const PANEL_ID = "discover-saved-panel";

function collectionTitle(collection: SavedCollection) {
  if (collection.kind === "favorites") return "Favorites";
  if (collection.kind === "notify") return "Notify Me";
  return collection.name;
}

function peopleCount(count: number) {
  return count === 1 ? "1 person" : `${count} people`;
}

function libraryPerson(person: LibraryTalent): Talent {
  return {
    id: person.userId ?? person.profileId,
    professionalProfileId: person.profileId,
    slug: person.userId || person.slug || person.profileId,
    name: person.name,
    location: person.location ?? undefined,
    styles: person.styles,
    imageUrl: person.avatarUrl ?? "",
  };
}

export function DiscoverSaved({
  variant = "lists",
}: {
  /** Industry Discover uses rosters in place of talent lists. */
  variant?: "lists" | "rosters";
} = {}) {
  const rosters = variant === "rosters";
  const noun = rosters ? "roster" : "list";
  const { requirePro } = useIndustryProOptional();
  const [tab, setTab] = useState<SavedTab>("mine");
  const [favorites, setFavorites] = useState<Talent[]>([]);
  const [notifying, setNotifying] = useState<Talent[]>([]);
  const [lists, setLists] = useState<ReferrerListSummary[]>([]);
  const [shared, setShared] = useState<ReferrerListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const request = useRef(0);
  const [open, setOpen] = useState<SavedCollection | null>(null);

  const loadHome = useCallback(async () => {
    if (rosters) {
      const [savedResult, rosterResult, notifyResult] = await Promise.all([
        listSavedTalent(),
        listCollections(),
        fetchReferrerFollowing(),
      ]);
      return {
        favoriteResult: {
          talent: savedResult.talent.map(libraryPerson),
          error: savedResult.error,
        },
        notifyResult,
        listResult: {
          lists: rosterResult.collections.map((collection) => ({
            id: collection.id,
            name: collection.name,
            memberCount: collection.talentCount,
            previewImageUrls: collection.previewAvatars,
          })),
          error: rosterResult.error,
        },
        sharedResult: null,
      };
    }
    const [favoriteResult, notifyResult, listResult, sharedResult] = await Promise.all([
      fetchReferrerFavorites(),
      fetchReferrerFollowing(),
      fetchReferrerDiscoverLists(),
      fetchSharedWithMeLists(),
    ]);
    return { favoriteResult, notifyResult, listResult, sharedResult };
  }, [rosters]);

  const refresh = useCallback(async () => {
    const generation = ++request.current;
    try {
      const { favoriteResult, notifyResult, listResult, sharedResult } = await loadHome();
      if (generation !== request.current) return;
      if (!favoriteResult.error) setFavorites(favoriteResult.talent);
      if (!notifyResult.error) setNotifying(notifyResult.talent);
      if (!listResult.error) setLists(listResult.lists);
      if (sharedResult && !sharedResult.error) setShared(sharedResult.lists);
      setError(favoriteResult.error ?? notifyResult.error ?? listResult.error ?? sharedResult?.error ?? null);
    } catch {
      if (generation === request.current) setError("Could not refresh saved people. Check your connection and retry.");
    } finally { if (generation === request.current) setLoading(false); }
  }, [loadHome]);

  useEffect(() => {
    const controller = request;
    const generation = ++controller.current;
    void loadHome().then(({ favoriteResult, notifyResult, listResult, sharedResult }) => {
      if (generation !== controller.current) return;
      if (!favoriteResult.error) setFavorites(favoriteResult.talent);
      if (!notifyResult.error) setNotifying(notifyResult.talent);
      if (!listResult.error) setLists(listResult.lists);
      if (sharedResult && !sharedResult.error) setShared(sharedResult.lists);
      setError(favoriteResult.error ?? notifyResult.error ?? listResult.error ?? sharedResult?.error ?? null);
    }).catch(() => { if (generation === controller.current) setError("Could not load saved people. Please retry."); })
      .finally(() => { if (generation === controller.current) setLoading(false); });
    const reconnect = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    return () => { controller.current++; window.removeEventListener("online", reconnect); document.removeEventListener("visibilitychange", reconnect); };
  }, [loadHome, refresh]);

  async function createList() {
    const trimmed = draftName.trim();
    if (!trimmed || mutation.current) return;
    if (rosters && !requirePro("roster_write")) return;
    mutation.current = true; setSaving(true); setError(null);
    try {
      const result = rosters ? await createCollection({ name: trimmed }) : await createDiscoverList(trimmed);
      setError(result.error ?? null);
      if (!result.id) return;
      setDraftName(""); setCreating(false); setTab("mine");
      await refresh();
      setOpen({ kind: "list", id: result.id, name: trimmed, owned: true });
    } catch { setError("Could not create this collection. Your name has been kept; please retry."); }
    finally { mutation.current = false; setSaving(false); }
  }

  const visibleLists = tab === "mine" ? lists : shared;

  return (
    <div className="discover-saved">
      <header className="discover-saved__header">
        <h1>Saved</h1>
        <button type="button" className="discover-saved__new" onClick={() => { setTab("mine"); setCreating(true); }}>
          <Plus size={16} aria-hidden /> New {noun}
        </button>
      </header>

      <div className="portfolio-tabs" role="tablist" aria-label={rosters ? "Saved rosters" : "Saved lists"}>
        {([["mine", rosters ? "My rosters" : "My lists"], ["shared", "Shared with me"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => { setTab(value); setCreating(false); }}
          >
            {label}
          </button>
        ))}
      </div>

      {creating ? (
        <form className="discover-saved__create" onSubmit={(event) => { event.preventDefault(); void createList(); }}>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setCreating(false); }}
            placeholder={`Name your ${noun}`}
            aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
            className="workspace-bare-input"
            autoFocus
          />
          <button type="submit" className="discover-saved__create-submit" disabled={saving || !draftName.trim()}>{saving ? "Creating…" : "Create"}</button>
          <button type="button" className="discover-saved__icon" aria-label="Cancel" onClick={() => setCreating(false)}>
            <X size={16} aria-hidden />
          </button>
        </form>
      ) : null}

      {error ? <p role="alert" className="discover-saved__error">{error} <button type="button" className="underline" onClick={() => void refresh()}>Retry</button></p> : null}

      {loading ? (
        <div className="discover-saved__grid" aria-hidden>
          {[0, 1, 2, 3].map((index) => <span key={index} className="discover-saved-card discover-saved-card--loading" />)}
        </div>
      ) : (
        <div className="discover-saved__grid">
          {tab === "mine" ? (
            <>
              <CollectionCard
                icon={<Heart size={16} aria-hidden />}
                title="Favorites"
                detail={peopleCount(favorites.length)}
                previews={favorites.map((person) => person.imageUrl)}
                active={open?.kind === "favorites"}
                onClick={() => setOpen({ kind: "favorites" })}
              />
              <CollectionCard
                icon={<Bell size={16} aria-hidden />}
                title="Notify Me"
                detail={peopleCount(notifying.length)}
                previews={notifying.map((person) => person.imageUrl)}
                active={open?.kind === "notify"}
                onClick={() => setOpen({ kind: "notify" })}
              />
            </>
          ) : null}
          {visibleLists.map((list) => (
            <CollectionCard
              key={list.id}
              title={list.name}
              detail={list.shared && list.ownerName ? `${peopleCount(list.memberCount)} · ${list.ownerName}` : peopleCount(list.memberCount)}
              previews={list.previewImageUrls ?? []}
              active={open?.kind === "list" && open.id === list.id}
              onClick={() => setOpen({ kind: "list", id: list.id, name: list.name, owned: !list.shared })}
            />
          ))}
          {tab === "shared" && !rosters && shared.length === 0 ? (
            <div className="discover-saved__empty">
              <Users size={20} aria-hidden />
              <p>{rosters ? "Rosters shared with you will show up here." : "Lists shared with you will show up here."}</p>
            </div>
          ) : null}
        </div>
      )}

      {tab === "shared" ? <SharedRostersSection /> : null}

      <SavedCollectionPanel
        key={open ? (open.kind === "list" ? open.id : open.kind) : "none"}
        collection={open}
        onClose={() => {
          setOpen(null);
          void refresh();
        }}
        variant={variant}
        onChanged={refresh}
        onRenamed={(name) => setOpen((current) => (current?.kind === "list" ? { ...current, name } : current))}
      />
    </div>
  );
}

function CollectionCard({
  icon,
  title,
  detail,
  previews,
  active,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  detail: string;
  previews: string[];
  active: boolean;
  onClick: () => void;
}) {
  const tiles = previews.filter(Boolean).slice(0, 4);
  return (
    <button type="button" className="discover-saved-card" data-active={active} onClick={onClick}>
      <span className="discover-saved-card__cover" data-count={tiles.length}>
        {tiles.length ? (
          tiles.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${url}-${index}`} src={url} alt="" loading="lazy" />
          ))
        ) : (
          <span className="discover-saved-card__placeholder">{icon ?? <Users size={20} aria-hidden />}</span>
        )}
        {icon && tiles.length ? <span className="discover-saved-card__badge">{icon}</span> : null}
      </span>
      <span className="discover-saved-card__copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function SavedCollectionPanel({
  collection,
  variant = "lists",
  onClose,
  onChanged,
  onRenamed,
}: {
  collection: SavedCollection | null;
  variant?: "lists" | "rosters";
  onClose: () => void;
  onChanged: () => Promise<void>;
  onRenamed: (name: string) => void;
}) {
  const rosters = variant === "rosters";
  const noun = rosters ? "roster" : "list";
  const notifications = useNotificationsPanel();
  const [members, setMembers] = useState<Talent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Talent | null>(null);
  const [chrome, setChrome] = useState<TalentProfileChrome | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [returned, setReturned] = useState(false);
  const bodyTop = useRef<HTMLSpanElement>(null);
  const scrollPosition = useRef(0);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!collection) return;
    let cancelled = false;
    const request = collection.kind === "favorites"
      ? rosters
        ? listSavedTalent().then((result) => ({ talent: result.talent.map(libraryPerson), error: result.error }))
        : fetchReferrerFavorites()
      : collection.kind === "notify"
        ? fetchReferrerFollowing()
        : rosters
          ? getCollection(collection.id).then((result) => ({
              talent: result.collection?.members.map(libraryPerson) ?? [],
              error: result.error === "favorites" ? null : result.error,
            }))
          : fetchReferrerDiscoverListMembers(collection.id);
    void request.then((result) => {
      if (cancelled) return;
      if (!result.error) setMembers(result.talent);
      setError(result.error);
    }).catch(() => { if (!cancelled) setError("Could not load these people. Check your connection and retry."); });
    return () => {
      cancelled = true;
    };
  }, [collection, rosters, attempt]);

  const handleChrome = useCallback((next: TalentProfileChrome) => {
    setChrome((current) => (current?.title === next.title && current?.pop === next.pop ? current : next));
  }, []);

  useEffect(() => { if (!profile) bodyTop.current?.closest(".workspace-side-panel__body")?.scrollTo({ top: scrollPosition.current }); }, [profile]);

  if (!collection) {
    return <WorkspaceSidePanel id={PANEL_ID} open={false} title="Saved" onClose={onClose}>{null}</WorkspaceSidePanel>;
  }

  const owned = collection.kind === "list" && collection.owned;
  const title = profile ? chrome?.title || profile.name : collectionTitle(collection);

  function back() {
    if (chrome?.pop) {
      chrome.pop();
      return;
    }
    setProfile(null);
    setChrome(null);
    setReturned(true);

  }

  async function mutate(action: () => Promise<void>) {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(null);
    try { await action(); }
    catch { setError("Could not confirm this change. Your edits have been kept; please retry."); }
    finally { mutation.current = false; setBusy(false); }
  }
  async function saveName() {
    if (collection?.kind !== "list" || renaming === null) return;
    const next = renaming.trim();
    if (!next) return;
    if (next === collection.name) { setRenaming(null); return; }
    await mutate(async () => {
      const result = rosters ? await updateCollection({ collectionId: collection.id, name: next }) : await renameDiscoverList(collection.id, next);
      if (result.error) { setError(result.error); return; }
      setRenaming(null); onRenamed(next); await onChanged();
    });
  }
  async function removeList() {
    if (collection?.kind !== "list") return;
    await mutate(async () => {
      const result = rosters ? await deleteCollection(collection.id) : await deleteDiscoverList(collection.id);
      if (result.error) { setError(result.error); return; }
      onClose(); await onChanged();
    });
  }
  async function removeMember(talentId: string) {
    if (collection?.kind !== "list") return;
    await mutate(async () => {
      const result = rosters ? await removeTalentFromCollection({ collectionId: collection.id, profileIds: [talentId] }) : await removeFromDiscoverList(collection.id, talentId);
      if (result.error) { setError(result.error); return; }
      setMembers(current => current?.filter(person => (rosters ? person.professionalProfileId || person.id : person.id) !== talentId) ?? null);
      await onChanged();
    });
  }

  return (
    <WorkspaceSidePanel
      id={PANEL_ID}
      open={!notifications.open}
      title={title}
      onClose={() => { if (!mutation.current) onClose(); }}
      leading={profile ? (
        <button type="button" className="workspace-notifications__close" aria-label="Back" onClick={back}>
          <ChevronLeft size={18} aria-hidden />
        </button>
      ) : null}
      actions={owned && !profile ? (
        <button
          type="button"
          className="workspace-notifications__close"
          aria-label={`Rename ${noun}`}
          onClick={() => setRenaming(collection.name)}
        >
          <Pencil size={16} aria-hidden />
        </button>
      ) : null}
    >
      <span ref={bodyTop} hidden />
      {profile ? (
        <TalentProfileSheet key={profile.id} slug={profile.slug || profile.id} userId={profile.id} onChrome={handleChrome} />
      ) : (
        <div className={`discover-saved-panel${returned ? " ui-swap-back" : ""}`}>
          {renaming !== null ? (
            <form className="discover-saved__create" onSubmit={(event) => { event.preventDefault(); void saveName(); }}>
              <input
                value={renaming}
                onChange={(event) => setRenaming(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setRenaming(null); } }}
                aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
                className="workspace-bare-input"
                autoFocus
              />
              <button type="submit" className="discover-saved__create-submit" disabled={busy || !renaming.trim()}>{busy ? "Saving…" : "Save"}</button>
              <button type="button" className="discover-saved__icon" aria-label="Cancel rename" onClick={() => setRenaming(null)}>
                <X size={16} aria-hidden />
              </button>
            </form>
          ) : null}
          {error ? <p role="alert" className="discover-saved__error">{error} <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>Retry loading</button></p> : null}
          {owned && rosters ? <RosterAccessButton listId={collection.id} listName={collection.name} /> : null}
          <p className="discover-saved-panel__count">{members === null ? "Loading…" : peopleCount(members.length)}</p>
          {members !== null && members.length === 0 ? (
            <div className="discover-saved__empty">
              <Users size={20} aria-hidden />
              <p>{collection.kind === "list" ? `Add people to this ${noun} from their profile.` : "No one here yet."}</p>
            </div>
          ) : null}
          {members?.length ? (
            <ul className="home-profile__menu discover-saved-panel__members">
              {members.map((person) => (
                <li key={person.id} className="discover-saved-member">
                  <button type="button" className="home-profile-row" onClick={() => { scrollPosition.current = bodyTop.current?.closest(".workspace-side-panel__body")?.scrollTop ?? 0; setProfile(person); }}>
                    {person.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="home-profile-row__thumb" src={person.imageUrl} alt="" />
                    ) : (
                      <span className="home-profile-row__thumb">{person.name.charAt(0)}</span>
                    )}
                    <span className="home-profile-row__copy">
                      <span className="home-profile-row__label">{person.name}</span>
                      <span className="home-profile-row__eyebrow">{person.location || "Location TBD"}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                  {owned ? (
                    <button
                      type="button"
                      className="discover-saved__icon"
                      disabled={busy}
                      aria-label={`Remove ${person.name} from ${noun}`}
                      onClick={() => void removeMember(rosters ? person.professionalProfileId || person.id : person.id)}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {owned ? (
            confirmDelete ? (
              <div className="discover-saved-panel__confirm">
                <p>Delete this {noun}? Its membership and shared access will be removed. Individual profiles are kept.</p>
                <div>
                  <button type="button" className="discover-saved__danger" disabled={busy} onClick={() => void removeList()}>Delete {noun}</button>
                  <button type="button" className="discover-saved__quiet" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" className="discover-saved__delete" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} aria-hidden /> Delete {noun}
              </button>
            )
          ) : null}
        </div>
      )}
    </WorkspaceSidePanel>
  );
}
