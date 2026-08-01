"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { searchActivityPeople } from "@/app/(buyer-app)/(paid)/calendar/activity-people-actions";
import type { DraftPersonRef } from "@/lib/talent-buyers/activities/types";

export function ActivityPeoplePicker({
  selected,
  onChange,
  label = "People",
  placeholder = "Search by name or username",
  emptyHint = "No one selected yet.",
}: {
  selected: DraftPersonRef[];
  onChange: (people: DraftPersonRef[]) => void;
  label?: string;
  placeholder?: string;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DraftPersonRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const response = await searchActivityPeople(trimmed);
        if (!response.ok) {
          setError(response.error);
          setResults([]);
          return;
        }
        setError(null);
        const selectedIds = new Set(selected.map((person) => person.userId));
        setResults(response.people.filter((person) => !selectedIds.has(person.userId)));
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, selected]);

  function addPerson(person: DraftPersonRef) {
    if (selected.some((row) => row.userId === person.userId)) return;
    onChange([...selected, person].slice(0, 12));
    setQuery("");
    setResults([]);
  }

  function removePerson(userId: string) {
    onChange(selected.filter((person) => person.userId !== userId));
  }

  return (
    <div className="activity-people-picker space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
          {label}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-full border border-white/12 bg-black/30 py-2.5 pl-10 pr-3.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      {query.trim().length >= 2 ? (
        <ul className="overflow-hidden rounded-2xl border border-white/10">
          {isPending && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-white/45">Searching…</li>
          ) : null}
          {!isPending && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-white/45">No matches.</li>
          ) : null}
          {results.map((person) => (
            <li key={person.userId}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.04]"
                onClick={() => addPerson(person)}
              >
                <PersonAvatar person={person} />
                <span className="truncate text-sm text-white">{person.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected.length ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((person) => (
            <li
              key={person.userId}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1 pl-1 pr-2"
            >
              <PersonAvatar person={person} size="sm" />
              <span className="max-w-[140px] truncate text-xs text-white/85">
                {person.displayName}
              </span>
              <button
                type="button"
                className="rounded-full p-0.5 text-white/45 hover:text-white"
                onClick={() => removePerson(person.userId)}
                aria-label={`Remove ${person.displayName}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/40">{emptyHint}</p>
      )}
    </div>
  );
}

function PersonAvatar({
  person,
  size = "md",
}: {
  person: DraftPersonRef;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-6" : "size-8";
  if (person.headshotUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={person.headshotUrl} alt="" className={`${dim} rounded-full object-cover`} />
    );
  }
  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/70`}
    >
      {person.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}
