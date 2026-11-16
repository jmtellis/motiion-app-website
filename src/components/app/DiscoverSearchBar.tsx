"use client";

import { VoiceSearchControl } from "./VoiceSearchControl";
import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

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
  const [suggestionResult, setSuggestionResult] = useState<{ query: string; names: string[] } | null>(null);
  const suggestions = suggestionResult?.query === value ? suggestionResult.names : [];
  const [pending, startTransition] = useTransition();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => {
      const form = rootRef.current;
      if (!form || !window.matchMedia("(max-width: 767px)").matches) return;
      const bottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      form.style.setProperty("--discover-suggestions-height", `${Math.max(60, bottom - form.getBoundingClientRect().bottom - 76)}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => () => { requestVersion.current += 1; }, [queryKey]);

  useEffect(() => {
    const fragment = explicitWorkedWith(value) ?? value;
    if (!open || fragment.trim().length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void suggestCreditCollaborators(fragment).then((names) => { if (!cancelled) setSuggestionResult({ query: value, names }); }).catch(() => { if (!cancelled) setSuggestionResult({ query: value, names: [] }); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [value, open]);

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
    inputRef.current?.blur();
    setOpen(false);
    requestVersion.current += 1;
    router.push(`${basePath}?view=explore&credit=${encodeURIComponent(name)}`);
  }

  async function submit(raw: string) {
    const id = ++requestVersion.current;
    const trimmed = raw.trim();
    inputRef.current?.blur();
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
  const showMenu = open;
  const loadingSuggestions = open && value.trim().length >= 2 && suggestionResult?.query !== value;

  return (
    <form
      ref={rootRef}
      className="talent-discovery-search"
      role="search"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") { inputRef.current?.blur(); setOpen(false); } }}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => submit(value));
      }}
    >
      {showMenu ? (
        <div className="talent-discovery-suggest" id={listId} role="region" aria-label="Search suggestions">
          <div className="talent-discovery-suggest__body" data-lenis-prevent>
          {loadingSuggestions ? <div className="talent-discovery-suggest__hint" role="status"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Finding credit suggestions…</div> : null}
          {!showSuggestions && !loadingSuggestions ? <div className="talent-discovery-suggest__hint">{value.trim() ? "Search by name, style, or skill. Try “worked with Beyoncé” for credits." : "Find talent by name, dance style, skill, or past collaborators."}</div> : null}
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
                <button key={query} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => startTransition(() => submit(query))}>
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
          <div className="talent-discovery-suggest__footer"><span>Enter to search · Esc to close</span><button type="button" onClick={() => { inputRef.current?.blur(); setOpen(false); }}>Done</button></div>
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
          setOpen(true);
          const fragment = explicitWorkedWith(next) ?? next;
          if (fragment.trim().length < 2) setSuggestionResult({ query: value, names: [] });
        }}
        onFocus={() => {
          setOpen(true);
          setRecentSearches(readRecentSearches(currentUserId));
        }}
        placeholder="Search talent or credits"
        enterKeyHint="search"
        type="search"
        aria-label="Search talent"
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
      <span className="discover-search-voice"><VoiceSearchControl onTranscript={(text) => { updateValue(text); inputRef.current?.focus(); }} /></span>
      <button type="submit" aria-label="Search talent" disabled={pending}>{pending ? <LoaderCircle size={16} className="animate-spin" aria-label="Searching" /> : <><span className="discover-search-submit-label">Search</span><Search className="discover-search-submit-icon" size={18} aria-hidden /></>}</button>
    </form>
  );
}
