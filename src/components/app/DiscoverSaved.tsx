"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDiscoverTalent } from "@/components/app/discover-selection";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import type { Talent } from "@/lib/talent-navigator/types";
import { fetchReferrerFavorites } from "@/lib/talent/referrer-lists";

/** Talent Saved: the people you’ve favorited. Lists and rosters are industry-only. */
export function DiscoverSaved() {
  const { openTalent } = useDiscoverTalent();
  const [favorites, setFavorites] = useState<Talent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const generation = ++request.current;
    try {
      const result = await fetchReferrerFavorites();
      if (generation !== request.current) return;
      if (!result.error) setFavorites(result.talent);
      setError(result.error);
    } catch {
      if (generation === request.current) setError("Could not load your favorites. Check your connection and retry.");
    }
  }, []);

  useEffect(() => {
    const controller = request;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const reconnect = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    return () => { controller.current++; window.removeEventListener("online", reconnect); document.removeEventListener("visibilitychange", reconnect); };
  }, [load]);

  return (
    <div className="discover-saved">
      <header className="discover-saved__header">
        <h1>Saved</h1>
        {favorites?.length ? <p>{favorites.length === 1 ? "1 person" : `${favorites.length} people`}</p> : null}
      </header>

      {error ? <p role="alert" className="discover-saved__error">{error} <button type="button" className="underline" onClick={() => void load()}>Retry</button></p> : null}

      {favorites === null && !error ? (
        <div className="discover-browse__grid" aria-hidden>
          {[0, 1, 2, 3, 4].map((index) => <span key={index} className="discover-browse-card discover-browse-card--loading" />)}
        </div>
      ) : null}

      {favorites?.length === 0 ? (
        <ProductEmptyState
          illustration="people"
          title="No favorites yet"
          description="Tap Favorite on anyone’s profile to keep them here."
          actionLabel="Browse talent"
          actionHref="/discover?view=browse"
        />
      ) : null}

      {favorites?.length ? (
        <div className="discover-browse__grid">
          {favorites.map((person) => (
            <button key={person.id} type="button" className="discover-browse-card" aria-label={`Open ${person.name} profile`} onClick={() => openTalent(person)}>
              <span className="discover-browse-card__photo">
                {person.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="discover-browse-card__initial">{person.name.charAt(0)}</span>
                )}
              </span>
              <span className="discover-browse-card__copy">
                <strong>{person.name}</strong>
                <small>
                  <MapPin size={12} aria-hidden />
                  {person.location || "Location TBD"}
                </small>
                {person.styles?.length ? <em>{person.styles.slice(0, 2).join(" · ")}</em> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
