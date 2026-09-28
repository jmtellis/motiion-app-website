"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { explicitWorkedWith, pickCreditRewrite } from "@/lib/talent-navigator/credit-intent";
import type { Talent } from "@/lib/talent-navigator/types";
import { suggestCreditCollaborators } from "@/lib/talent/discover-actions";
import { clearRecentlyViewed } from "@/lib/talent/referrer-lists";

const RECENT_SEARCHES_KEY = "motiion.recentSearchQueries";

function readRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

function writeRecentSearch(query: string) {
  const next = [query, ...readRecentSearches().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 3);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function DiscoverSearchBar({
  keyword,
  credit,
  recentlyViewed,
  onOpenTalent,
  onRecentlyViewedChange,
}: {
  keyword: string;
  credit: string;
  recentlyViewed: Talent[];
  onOpenTalent: (talent: Talent) => void;
  onRecentlyViewedChange: (talent: Talent[]) => void;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const queryKey = `${credit}\n${keyword}`;
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const value = draft?.key === queryKey ? draft.value : credit || keyword;
  function updateValue(next: string) {
    setDraft({ key: queryKey, value: next });
  }
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const fragment = explicitWorkedWith(value) ?? value;
    if (fragment.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void suggestCreditCollaborators(fragment).then(setSuggestions);
    }, 180);
    return () => window.clearTimeout(handle);
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
    setRecentSearches(writeRecentSearch(query));
  }

  function goToCredit(name: string) {
    remember(name);
    setOpen(false);
    router.push(`/discover?credit=${encodeURIComponent(name)}`);
  }

  async function submit(raw: string) {
    const trimmed = raw.trim();
    setOpen(false);
    if (!trimmed) {
      router.push("/discover");
      return;
    }
    remember(trimmed);
    const explicit = explicitWorkedWith(trimmed);
    const names = explicit ? [] : await suggestCreditCollaborators(trimmed);
    const creditName = explicit ?? pickCreditRewrite(trimmed, names);
    if (creditName) {
      router.push(`/discover?credit=${encodeURIComponent(creditName)}`);
      return;
    }
    router.push(`/discover?keyword=${encodeURIComponent(trimmed)}`);
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
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
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
          setRecentSearches(readRecentSearches());
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
            router.push("/discover");
          }}
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
      <button type="submit">Search</button>
    </form>
  );
}
