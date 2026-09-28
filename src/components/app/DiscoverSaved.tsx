"use client";

import { Bell, ChevronLeft, Heart, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useDiscoverTalent } from "@/components/app/discover-selection";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
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

type SavedSegment = "mine" | "shared";
type SavedRoute =
  | { kind: "home" }
  | { kind: "favorites" }
  | { kind: "notify" }
  | { kind: "list"; id: string; name: string; owned: boolean };

export function DiscoverSaved() {
  const { openTalent } = useDiscoverTalent();
  const [segment, setSegment] = useState<SavedSegment>("mine");
  const [route, setRoute] = useState<SavedRoute>({ kind: "home" });
  const [favorites, setFavorites] = useState<Talent[]>([]);
  const [notifying, setNotifying] = useState<Talent[]>([]);
  const [lists, setLists] = useState<ReferrerListSummary[]>([]);
  const [shared, setShared] = useState<ReferrerListSummary[]>([]);
  const [members, setMembers] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");

  async function loadHome() {
    const [favoriteResult, notifyResult, listResult, sharedResult] = await Promise.all([
      fetchReferrerFavorites(),
      fetchReferrerFollowing(),
      fetchReferrerDiscoverLists(),
      fetchSharedWithMeLists(),
    ]);
    setFavorites(favoriteResult.talent);
    setNotifying(notifyResult.talent);
    setLists(listResult.lists);
    setShared(sharedResult.lists);
    setError(favoriteResult.error ?? notifyResult.error ?? listResult.error ?? sharedResult.error);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchReferrerFavorites(),
      fetchReferrerFollowing(),
      fetchReferrerDiscoverLists(),
      fetchSharedWithMeLists(),
    ]).then(([favoriteResult, notifyResult, listResult, sharedResult]) => {
      if (cancelled) return;
      setFavorites(favoriteResult.talent);
      setNotifying(notifyResult.talent);
      setLists(listResult.lists);
      setShared(sharedResult.lists);
      setError(favoriteResult.error ?? notifyResult.error ?? listResult.error ?? sharedResult.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (route.kind === "home") return;
    let cancelled = false;
    const request = route.kind === "favorites"
      ? fetchReferrerFavorites()
      : route.kind === "notify"
        ? fetchReferrerFollowing()
        : fetchReferrerDiscoverListMembers(route.id);
    void request.then((result) => {
      if (cancelled) return;
      setMembers(result.talent);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  async function createList() {
    const trimmed = draftName.trim();
    const result = await createDiscoverList(trimmed);
    setError(result.error);
    if (!result.id) return;
    setDraftName("");
    setCreating(false);
    await loadHome();
    setLoading(true);
    setRoute({ kind: "list", id: result.id, name: trimmed, owned: true });
  }

  async function rename(list: Extract<SavedRoute, { kind: "list" }>) {
    const next = window.prompt("Rename list", list.name)?.trim();
    if (!next || next === list.name) return;
    const result = await renameDiscoverList(list.id, next);
    setError(result.error);
    if (result.error) return;
    setRoute({ ...list, name: next });
    setLists((current) => current.map((item) => item.id === list.id ? { ...item, name: next } : item));
  }

  async function removeList(listId: string) {
    if (!window.confirm("Delete this list? People on it stay in Favorites.")) return;
    const result = await deleteDiscoverList(listId);
    setError(result.error);
    if (result.error) return;
    setRoute({ kind: "home" });
    await loadHome();
  }

  async function removeMember(listId: string, talentId: string) {
    const result = await removeFromDiscoverList(listId, talentId);
    setError(result.error);
    if (!result.error) setMembers((current) => current.filter((person) => person.id !== talentId));
  }

  const visibleLists = segment === "mine" ? lists : shared;

  return (
    <div className="talent-saved">
      {route.kind === "home" ? (
        <>
          <SegmentedControl
            options={[
              { value: "mine" as const, label: "My Lists" },
              { value: "shared" as const, label: "Shared with me" },
            ]}
            value={segment}
            onChange={(next) => {
              setSegment(next);
              setCreating(false);
            }}
            ariaLabel="Saved lists"
            hug
            activeTone="white"
          />
          {error ? <p className="talent-saved-error">{error}</p> : null}
          {loading ? <p className="talent-saved-empty">Loading lists…</p> : null}
          {!loading && segment === "mine" ? (
            <>
              <ListRow icon={<Heart size={18} aria-hidden />} title="Favorites" detail={`${favorites.length} saved`} previews={favorites.slice(0, 3).map((person) => person.imageUrl)} onClick={() => { setLoading(true); setRoute({ kind: "favorites" }); }} />
              <ListRow icon={<Bell size={18} aria-hidden />} title="Notify Me" detail={`${notifying.length} people`} previews={notifying.slice(0, 3).map((person) => person.imageUrl)} onClick={() => { setLoading(true); setRoute({ kind: "notify" }); }} />
            </>
          ) : null}
          {!loading ? visibleLists.map((list) => (
            <ListRow
              key={list.id}
              title={list.name}
              detail={list.shared ? `${list.memberCount} people${list.ownerName ? ` · ${list.ownerName}` : ""}` : `${list.memberCount} people`}
              previews={list.previewImageUrls ?? []}
              onClick={() => { setLoading(true); setRoute({ kind: "list", id: list.id, name: list.name, owned: !list.shared }); }}
            />
          )) : null}
          {!loading && segment === "shared" && shared.length === 0 ? (
            <p className="talent-saved-empty">Lists shared with you will show up here.</p>
          ) : null}
          {!loading && segment === "mine" ? (
            creating ? (
              <form className="talent-saved-create" onSubmit={(event) => { event.preventDefault(); void createList(); }}>
                <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="List name" aria-label="List name" autoFocus />
                <button type="submit">Create</button>
                <button type="button" onClick={() => setCreating(false)}>Cancel</button>
              </form>
            ) : (
              <button type="button" className="talent-saved-new" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden /> New list
              </button>
            )
          ) : null}
        </>
      ) : (
        <section className="talent-saved-detail">
          <header>
            <button type="button" onClick={() => setRoute({ kind: "home" })}>
              <ChevronLeft size={16} aria-hidden /> Lists
            </button>
            <h2>{route.kind === "favorites" ? "Favorites" : route.kind === "notify" ? "Notify Me" : route.name}</h2>
            {route.kind === "list" && route.owned ? (
              <div>
                <button type="button" onClick={() => void rename(route)}>Rename</button>
                <button type="button" onClick={() => void removeList(route.id)} aria-label="Delete list">
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ) : null}
          </header>
          {error ? <p className="talent-saved-error">{error}</p> : null}
          {loading ? <p className="talent-saved-empty">Loading…</p> : null}
          {!loading && members.length === 0 ? <p className="talent-saved-empty">No one here yet.</p> : null}
          <div className="talent-saved-grid">
            {members.map((person) => (
              <article key={person.id}>
                <button type="button" onClick={() => openTalent(person)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={person.imageUrl} alt="" />
                  <span>{person.name}</span>
                  <small>{person.location || "Location TBD"}</small>
                </button>
                {route.kind === "list" && route.owned ? (
                  <button type="button" aria-label={`Remove ${person.name}`} onClick={() => void removeMember(route.id, person.id)}>
                    Remove
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ListRow({
  icon,
  title,
  detail,
  previews,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  detail: string;
  previews: string[];
  onClick: () => void;
}) {
  return (
    <button type="button" className="talent-saved-row" onClick={onClick}>
      {icon ? <span className="talent-saved-row-icon">{icon}</span> : null}
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="talent-saved-previews" aria-hidden>
        {previews.map((url, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${url}-${index}`} src={url} alt="" />
        ))}
      </span>
    </button>
  );
}
