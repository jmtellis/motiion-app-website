"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { loadCommunityFavorites, searchCommunityArtists, setCommunityArtistFollowing, type CommunityArtist, type CommunityFeed } from "@/lib/app/community";

export function CommunityFavorites({ initial }: { initial: Awaited<ReturnType<typeof loadCommunityFavorites>> }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState(initial.error);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityArtist[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const generation = useRef(0);
  const mutation = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  useEffect(() => {
    if (!open) return;
    const version = ++generation.current;
    const timer = window.setTimeout(() => {
      setSearching(true); setSearchError(null);
      void searchCommunityArtists(query).then((result) => { if (version !== generation.current) return; setResults(result.artists); setSearchError(result.error); })
        .catch(() => { if (version === generation.current) setSearchError("Artist search failed. Edit your search to retry."); })
        .finally(() => { if (version === generation.current) setSearching(false); });
    }, 200);
    return () => { window.clearTimeout(timer); generation.current += 1; };
  }, [query, open]);
  async function refresh() {
    try {
      const result = await loadCommunityFavorites();
      if (!mounted.current) return;
      setSnapshot((current) => ({ ...result, favorites: result.favorites ?? current.favorites, feed: result.feed ?? current.feed })); setError(result.error);
    } catch { if (mounted.current) setError("Could not refresh your artists. Please retry."); }
  }
  async function toggle(artist: CommunityArtist, following: boolean) {
    if (mutation.current) return;
    mutation.current = true; setBusy(artist.normalized_name); setError(null);
    try {
      const result = await setCommunityArtistFollowing(artist, following);
      if (!mounted.current) return;
      if (!result.ok) { setError(result.error); return; }
      setSnapshot((current) => ({ ...current, favorites: following ? [...(current.favorites ?? []).filter((item) => item.normalized_name !== artist.normalized_name), artist] : (current.favorites ?? []).filter((item) => item.normalized_name !== artist.normalized_name) }));
      if (!following && selected === artist.normalized_name) setSelected(null);
      await refresh();
    } catch { if (mounted.current) setError("Could not update your artists. Please retry."); }
    finally { mutation.current = false; if (mounted.current) setBusy(null); }
  }
  const favorites = snapshot.favorites ?? [];
  const feed: CommunityFeed = snapshot.feed ?? { groups: [], activities: [] };
  const groups = (feed.groups ?? []).filter((group) => !selected || group.artist_normalized === selected);
  return <section className="space-y-5" aria-labelledby="favorite-artists-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="favorite-artists-title" className="text-xl font-semibold">Artists you follow</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">Discover the dancers and productions behind your favorite artists.</p></div><button type="button" className="ui-button ui-button--secondary" onClick={() => setOpen(true)}>Manage artists</button></div>
    {error ? <p role="alert" className="ui-notice" data-tone="error">{error} <button type="button" className="underline" onClick={() => void refresh()}>Retry</button></p> : null}
    {favorites.length ? <div role="group" aria-label="Filter by artist" className="flex flex-wrap gap-2"><button type="button" className="ui-button ui-button--secondary" aria-pressed={!selected} onClick={() => setSelected(null)}>All artists</button>{favorites.map((artist) => <button key={artist.normalized_name} type="button" className="ui-button ui-button--secondary" aria-pressed={selected === artist.normalized_name} onClick={() => setSelected(selected === artist.normalized_name ? null : artist.normalized_name)}>{artist.display_name}</button>)}</div> : !error ? <p className="rounded-xl border border-dashed border-[var(--ui-border)] p-5 text-sm text-[var(--ui-muted)]">Follow an artist to find related casts, dancers and upcoming activities.</p> : null}
    {groups.length ? <div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <article key={`${group.artist_normalized}:${group.experience_title}`} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5"><p className="text-xs text-[var(--ui-muted)]">Because you follow {group.artist_display}</p><h3 className="mt-2 font-semibold">{group.experience_title}</h3><ul className="mt-3 flex flex-wrap gap-2">{group.dancers.map((dancer) => <li key={dancer.user_id}><Link href={`/profile/${dancer.user_id}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--ui-border)] px-3 text-sm hover:underline">{dancer.full_name || "View dancer"}</Link></li>)}</ul></article>)}</div> : favorites.length && !error ? <p className="text-sm text-[var(--ui-muted)]">No matching productions yet. Your followed artists are saved.</p> : null}
    {feed.activities?.length ? <div><h3 className="font-semibold">See them live</h3><ul className="mt-3 space-y-2">{feed.activities.map((activity) => <li key={activity.id}><Link href={`/activity/${activity.id}`} className="underline">{activity.title || "View activity"}</Link></li>)}</ul></div> : null}
    <nav aria-label="Community activities" className="flex flex-wrap gap-4 text-sm"><Link href="/community/events?week=1" className="underline">Live this week</Link><Link href="/community/classes" className="underline">Find classes & sessions</Link><Link href="/schedule" className="underline">My calendar</Link></nav>
    <Modal open={open} onClose={() => { if (!mutation.current) setOpen(false); }} title="Follow artists" placement="drawer"><div className="space-y-4">{favorites.length ? <section aria-label="Currently following"><h3 className="text-sm font-semibold">Following</h3><ul className="mt-2 space-y-2">{favorites.map((artist) => <li key={artist.normalized_name} className="flex items-center justify-between gap-3"><span>{artist.display_name}</span><button type="button" className="ui-button ui-button--secondary" disabled={Boolean(busy)} aria-label={`Unfollow ${artist.display_name}`} onClick={() => void toggle(artist, false)}>Remove</button></li>)}</ul></section> : null}<label className="ui-field"><span className="ui-field__label">Search artists</span><input type="search" value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} placeholder="Artist name" /></label>{searching ? <p role="status">Searching…</p> : null}{searchError ? <p role="alert">{searchError}</p> : null}{error ? <p role="alert" className="text-[var(--ui-danger)]">{error}</p> : null}<ul className="divide-y divide-[var(--ui-border)]">{results.map((artist) => { const following = favorites.some((item) => item.normalized_name === artist.normalized_name); return <li key={artist.normalized_name} className="flex items-center justify-between gap-3 py-3"><span className="font-medium">{artist.display_name}</span><button type="button" className="ui-button ui-button--secondary" aria-pressed={following} disabled={Boolean(busy)} onClick={() => void toggle(artist, !following)}>{busy === artist.normalized_name ? "Saving…" : following ? "Following · Remove" : "Follow"}</button></li>; })}</ul>{!searching && !searchError && !results.length ? <p className="text-sm text-[var(--ui-muted)]">No matching artists. Try another name.</p> : null}</div></Modal>
  </section>;
}
