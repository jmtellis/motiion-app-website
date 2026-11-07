"use client";

import { MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  AttributesFilter,
  EMPTY_DISCOVER_ATTRIBUTES,
  StylesFilter,
  TypeFilter,
  countDiscoverAttributes,
  type DiscoverBrowseAttributes,
} from "@/components/app/DiscoverView";
import { DiscoverBrowseSkeleton } from "@/components/app/DiscoverSkeletons";
import { useDiscoverTalent } from "@/components/app/discover-selection";
import { VoiceSearchControl } from "@/components/app/VoiceSearchControl";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import { matchesGenderFilter, isRepresented } from "@/lib/search/talent-filter-logic";
import { profileMatchesHeightFilter } from "@/lib/talent-navigator/height-filter";
import type { Talent } from "@/lib/talent-navigator/types";
import { fetchReferrerFavorites } from "@/lib/talent/referrer-lists";

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function includesAny(haystack: string[], needles: string[]) {
  if (!needles.length) return true;
  const set = new Set(haystack.map(normalize).filter(Boolean));
  return needles.some((needle) => set.has(normalize(needle)));
}

function matchesSavedPerson(
  person: Talent,
  keyword: string,
  subtype: string,
  styles: string[],
  attributes: DiscoverBrowseAttributes,
) {
  if (keyword) {
    const haystack = [person.name, person.location, person.agency, ...(person.styles ?? []), ...(person.skills ?? []), ...(person.talentTypes ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(keyword)) return false;
  }

  if (subtype) {
    const types = (person.talentTypes ?? []).map(normalize);
    if (!types.some((type) => type.includes(normalize(subtype)))) return false;
  }

  if (styles.length && !includesAny(person.styles ?? [], styles)) return false;

  if (attributes.location) {
    const location = normalize(person.location);
    const wanted = normalize(attributes.location);
    if (!location || (!location.includes(wanted) && !wanted.includes(location))) return false;
  }

  if (attributes.gender && !matchesGenderFilter(person.gender, attributes.gender)) return false;
  if (attributes.height && !profileMatchesHeightFilter(person.height, attributes.height)) return false;
  if (attributes.union && normalize(person.unionStatus) !== normalize(attributes.union)) return false;
  if (attributes.rep === "Represented" && !isRepresented(person.agency)) return false;
  if (attributes.rep === "Independent" && isRepresented(person.agency)) return false;
  if (attributes.skills.length && !includesAny(person.skills ?? [], attributes.skills)) return false;
  if (attributes.ethnicity.length) {
    const ethnicity = normalize(person.ethnicity);
    if (!ethnicity || !attributes.ethnicity.some((value) => ethnicity.includes(normalize(value.split("/")[0])))) {
      return false;
    }
  }
  if (attributes.hair.length && !attributes.hair.some((value) => normalize(person.hairColor) === normalize(value))) {
    return false;
  }
  if (attributes.eyes.length && !attributes.eyes.some((value) => normalize(person.eyeColor) === normalize(value))) {
    return false;
  }

  return true;
}

/** Talent Saved: the people you’ve favorited. Lists and rosters are industry-only. */
export function DiscoverSaved() {
  const { openTalent, selectedTalentId } = useDiscoverTalent();
  const [favorites, setFavorites] = useState<Talent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [draftKeyword, setDraftKeyword] = useState("");
  const [subtype, setSubtype] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<DiscoverBrowseAttributes>(EMPTY_DISCOVER_ATTRIBUTES);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const filtered = useMemo(() => {
    if (!favorites) return null;
    const needle = keyword.trim().toLowerCase();
    return favorites.filter((person) => matchesSavedPerson(person, needle, subtype, styles, attributes));
  }, [favorites, keyword, subtype, styles, attributes]);

  const hasFilters = Boolean(
    keyword.trim() || subtype || styles.length || countDiscoverAttributes(attributes),
  );

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
  }

  function clearFilters() {
    setKeyword("");
    setDraftKeyword("");
    setSubtype("");
    setStyles([]);
    setAttributes(EMPTY_DISCOVER_ATTRIBUTES);
  }

  return (
    <div className="discover-saved">
      {favorites && favorites.length > 0 ? (
        <>
          <div className="discover-browse__toolbar">
            <form className="discover-browse__filters" onSubmit={onSearch}>
              <TypeFilter value={subtype} onChange={setSubtype} />
              <StylesFilter value={styles} onApply={setStyles} />
              <AttributesFilter value={attributes} onApply={setAttributes} />
              <label className="discover-browse__field discover-browse__field--search">
                <input
                  name="keyword"
                  ref={searchInputRef}
                  value={draftKeyword}
                  onChange={(event) => setDraftKeyword(event.target.value)}
                  placeholder="Name, style, skill"
                  aria-label="Search saved talent"
                  className="workspace-bare-input"
                  enterKeyHint="search"
                />
              </label>
              <VoiceSearchControl onTranscript={(text) => { setDraftKeyword(text); searchInputRef.current?.focus(); }} />
              <button type="submit" className="discover-browse__submit" aria-label="Search" title="Search">
                <Search size={16} aria-hidden />
              </button>
            </form>
          </div>
          <div className="discover-browse__bar">
            <p aria-live="polite">
              {filtered?.length
                ? `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "person" : "people"}`
                : "No matches"}
              {favorites.length !== filtered?.length ? ` · ${favorites.length.toLocaleString()} saved` : ""}
            </p>
            {hasFilters ? (
              <button type="button" className="discover-browse__reset" onClick={clearFilters}>
                <X size={13} aria-hidden />
                Clear filters
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? <p role="alert" className="discover-saved__error">{error} <button type="button" className="underline" onClick={() => void load()}>Retry</button></p> : null}

      {favorites === null && !error ? <DiscoverBrowseSkeleton count={8} /> : null}

      {favorites?.length === 0 ? (
        <ProductEmptyState
          illustration="people"
          title="No favorites yet"
          description="Tap Favorite on anyone’s profile to keep them here."
          actionLabel="Explore talent"
          actionHref="/discover?view=explore"
        />
      ) : null}

      {favorites && favorites.length > 0 && filtered?.length === 0 ? (
        <ProductEmptyState
          illustration="search"
          title="No matches in Saved"
          description="Try a different name or clear a filter."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : null}

      {filtered?.length ? (
        <div className="discover-browse__grid discover-skel-enter">
          {filtered.map((person) => (
            <button
              key={person.id}
              type="button"
              className={`discover-browse-card${selectedTalentId === person.id ? " discover-browse-card--active" : ""}`}
              aria-label={`Open ${person.name} profile`}
              aria-pressed={selectedTalentId === person.id}
              onClick={() => openTalent(person)}
            >
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
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
