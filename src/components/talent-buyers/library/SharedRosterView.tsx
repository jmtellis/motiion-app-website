"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSharedRoster, type SharedRoster } from "@/lib/talent-buyers/roster-user-shares";
export function SharedRosterView({ listId }: { listId: string }) {
  const [roster, setRoster] = useState<SharedRoster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const setQuery = (value: string) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };
  useEffect(() => {
    let cancelled = false;
    void getSharedRoster(listId).then(result => {
      if (cancelled) return;
      setError(result.error);
      // A failed authorization must remove previously displayed private data.
      setRoster(result.roster);
    }).catch(() => { if (!cancelled) setError("Could not refresh this roster. Check your connection and retry."); });
    const refresh = () => { if (document.visibilityState === "visible") setAttempt(value => value + 1); };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [listId, attempt]);
  useEffect(() => {
    if (!roster?.expiresAt) return;
    const delay = Math.max(0, new Date(roster.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => setAttempt(value => value + 1), Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [roster]);
  const members = roster?.members.filter(person => [person.name, person.location, ...person.styles, person.notes].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  return <div className="space-y-6">
    {error ? <div role="alert" className="ui-notice" data-tone="error">{error} <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : null}
    {!roster && !error ? <p role="status">Loading shared roster…</p> : null}
    {roster ? <><header><p className="text-sm text-[var(--ui-muted)]">Shared by {roster.ownerName}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{roster.name}</h1>{roster.description ? <p className="mt-3 max-w-2xl whitespace-pre-wrap">{roster.description}</p> : null}<p className="mt-3 text-sm text-[var(--ui-muted)]">{roster.members.length} {roster.members.length === 1 ? "person" : "people"} · {roster.expiresAt ? `Access until ${new Date(roster.expiresAt).toLocaleString()}` : "Access until removed"}</p></header><label className="ui-field max-w-md"><span className="ui-field__label">Search roster</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, style, location, or notes"/></label>
      {members.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{members.map(person => <li key={person.id} className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]"><RosterPortrait src={person.avatarUrl} name={person.name}/><div className="space-y-2 p-5"><h2 className="font-semibold">{person.name}</h2>{person.location ? <p className="text-sm text-[var(--ui-muted)]">{person.location}</p> : null}{person.styles.length ? <p className="text-xs text-[var(--ui-muted)]">{person.styles.join(" · ")}</p> : null}{person.notes ? <p className="whitespace-pre-wrap border-t border-[var(--ui-border)] pt-3 text-sm">{person.notes}</p> : null}{person.userId || person.slug ? <Link className="inline-block pt-2 text-sm underline underline-offset-4" href={`/profile/${encodeURIComponent(person.userId || person.slug || "")}`}>View public profile</Link> : null}{person.unavailable ? <p className="text-sm text-[var(--ui-muted)]">This profile is no longer available.</p> : null}</div></li>)}</ul> : <p className="rounded-xl border border-dashed border-[var(--ui-border)] p-6 text-[var(--ui-muted)]">{query ? "No people match your search." : "No people have been added yet."}</p>}</> : null}
  </div>;
}

function RosterPortrait({ src, name }: { src: string | null; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return <div className="flex aspect-[4/3] items-center justify-center bg-[var(--ui-surface-soft)] text-4xl text-[var(--ui-muted)]" aria-hidden>{name.slice(0, 1)}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" onError={() => setFailedSrc(src)}/>;
}
