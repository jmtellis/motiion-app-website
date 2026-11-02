"use client";

import { VoiceSearchControl } from "./VoiceSearchControl";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { explicitWorkedWith, pickCreditRewrite } from "@/lib/talent-navigator/credit-intent";
import type { Talent } from "@/lib/talent-navigator/types";
import { suggestCreditCollaborators } from "@/lib/talent/discover-actions";
import { clearRecentlyViewed } from "@/lib/talent/referrer-lists";

const RECENT_SEARCHES_KEY = "motiion.recentSearchQueries";

function readRecentSearches(userId: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`${RECENT_SEARCHES_KEY}:${userId}`) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

function writeRecentSearch(query: string, userId: string) {
  const next = [query, ...readRecentSearches(userId).filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 3);
  try { sessionStorage.setItem(`${RECENT_SEARCHES_KEY}:${userId}`, JSON.stringify(next)); } catch { /* Search remains available without browser storage. */ }
  return next;
}

export function DiscoverSearchBar({
  keyword,
  credit,
  basePath = "/discover",
  currentUserId,
  recentlyViewed,
  onOpenTalent,
  onRecentlyViewedChange,
}: {
  basePath?: string;
  currentUserId: string;
  keyword: string;
  credit: string;
  recentlyViewed: Talent[];
  onOpenTalent: (talent: Talent) => void;
  onRecentlyViewedChange: (talent: Talent[]) => void;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const queryKey = `${credit}\n${keyword}`;
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const value = draft?.key === queryKey ? draft.value : credit || keyword;
  function updateValue(next: string) {
    requestVersion.current += 1;
    setDraft({ key: queryKey, value: next });
  }
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => () => { requestVersion.current += 1; }, [queryKey]);

  useEffect(() => {
    const fragment = explicitWorkedWith(value) ?? value;
    if (fragment.trim().length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void suggestCreditCollaborators(fragment).then((names) => { if (!cancelled) setSuggestions(names); }).catch(() => { if (!cancelled) setSuggestions([]); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function remember(query: string) {
    setRecentSearches(writeRecentSearch(query, currentUserId));
  }

  function goToCredit(name: string) {
    remember(name);
    setOpen(false);
    requestVersion.current += 1;
    router.push(`${basePath}?view=explore&credit=${encodeURIComponent(name)}`);
  }

  async function submit(raw: string) {
    const id = ++requestVersion.current;
    const trimmed = raw.trim();
    setOpen(false);
    if (!trimmed) {
      router.push(`${basePath}?view=explore`);
      return;
    }
    remember(trimmed);
    const explicit = explicitWorkedWith(trimmed);
    const names = explicit ? [] : await suggestCreditCollaborators(trimmed).catch(() => []);
    if (id !== requestVersion.current) return;
    const creditName = explicit ?? pickCreditRewrite(trimmed, names);
    if (creditName) {
      router.push(`${basePath}?view=explore&credit=${encodeURIComponent(creditName)}`);
      return;
    }
    router.push(`${basePath}?view=explore&keyword=${encodeURIComponent(trimmed)}`);
  }

  const showSuggestions = suggestions.length > 0 && value.trim().length >= 2;
  const showMenu = open && (showSuggestions || recentSearches.length > 0 || recentlyViewed.length > 0);

  return (
    <form
      ref={rootRef}
      className="talent-discovery-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(value);
      }}
    >
      {showMenu ? (
        <div className="talent-discovery-suggest" id={listId} role="listbox" aria-label="Search suggestions">
          {showSuggestions ? (
            <section>
              <p>Worked with</p>
              {suggestions.map((name) => (
                <button key={name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => goToCredit(name)}>
                  <span>Worked with: {name}</span>
                  <small>From credits</small>
                </button>
              ))}
            </section>
          ) : null}
          {recentSearches.length ? (
            <section>
              <p>
                Recent searches
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    try { sessionStorage.removeItem(`${RECENT_SEARCHES_KEY}:${currentUserId}`); } catch { /* Optional storage. */ }
                    setRecentSearches([]);
                  }}
                >
                  Clear
                </button>
              </p>
              {recentSearches.map((query) => (
                <button key={query} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void submit(query)}>
                  <span>{query}</span>
                </button>
              ))}
            </section>
          ) : null}
          {recentlyViewed.length ? (
            <section>
              <p>
                Recently viewed
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onRecentlyViewedChange([]);
                    void clearRecentlyViewed();
                  }}
                >
                  Clear
                </button>
              </p>
              <div className="talent-discovery-recent-people">
                {recentlyViewed.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      onOpenTalent(person);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={person.imageUrl} alt="" />
                    <span>{person.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
      <Search size={18} aria-hidden />
      <input
        ref={inputRef}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        className="workspace-bare-input"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          updateValue(next);
          const fragment = explicitWorkedWith(next) ?? next;
          if (fragment.trim().length < 2) setSuggestions([]);
        }}
        onFocus={() => {
          setOpen(true);
          setRecentSearches(readRecentSearches(currentUserId));
        }}
        placeholder="Find dancers, styles, or who they've worked with"
        aria-label="Search talent"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showMenu}
        aria-controls={showMenu ? listId : undefined}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="talent-discovery-search-clear"
          aria-label="Clear search"
          onClick={() => {
          updateValue("");
            router.push(`${basePath}?view=explore`);
          }}
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
      <VoiceSearchControl onTranscript={(text) => { updateValue(text); inputRef.current?.focus(); }} />
      <button type="submit">Search</button>
    </form>
  );
}
