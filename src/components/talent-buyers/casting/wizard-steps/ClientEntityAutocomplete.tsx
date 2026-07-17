"use client";

import { useEffect, useRef, useState } from "react";

import { AuthField } from "@/components/auth/ui";
import type { ClientEntityKind, ClientSearchResult } from "@/lib/clients/types";

import "../../project/project-create.css";
import "../../project/casting-create-wizard.css";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

const KIND_OPTIONS: { value: ClientEntityKind; label: string; endpoint: string }[] = [
  { value: "artist", label: "Artist", endpoint: "/api/clients/artists" },
  { value: "project", label: "Project", endpoint: "/api/clients/projects" },
  { value: "company", label: "Company", endpoint: "/api/clients/companies" },
];

export type SelectedClient = ClientSearchResult & { kind: ClientEntityKind };

export function ClientEntityAutocomplete({
  kind,
  onKindChange,
  value,
  imageUrl,
  onChange,
  onSelect,
}: {
  kind: ClientEntityKind;
  onKindChange: (kind: ClientEntityKind) => void;
  value: string;
  imageUrl?: string;
  onChange: (value: string) => void;
  onSelect: (client: SelectedClient) => void;
}) {
  const kindMeta = KIND_OPTIONS.find((option) => option.value === kind) ?? KIND_OPTIONS[2];
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canSearch = query.trim().length >= MIN_SEARCH_LENGTH;
  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || !canSearch) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${kindMeta.endpoint}?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: ClientSearchResult[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Search failed.");
          setResults([]);
          return;
        }
        setResults(payload.results ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Search failed.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query, canSearch, kindMeta.endpoint]);

  function selectResult(result: ClientSearchResult) {
    setOpen(false);
    setResults([]);
    setQuery(result.name);
    onChange(result.name);
    onSelect({ ...result, kind });
  }

  function switchKind(next: ClientEntityKind) {
    if (next === kind) return;
    setResults([]);
    setError(null);
    onKindChange(next);
  }

  return (
    <AuthField label="Client">
      <div className="relative" ref={containerRef}>
        <div className="casting-client-input">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="casting-client-input__thumb" />
          ) : null}
          <input
            className="casting-client-input__field"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              onChange(next);
              setOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setOpen(true);
            }}
            placeholder="Search for an artist, project, or company"
            autoComplete="off"
          />
        </div>

        {showDropdown ? (
          <div className="project-create__location-dropdown casting-client-search-dropdown">
            <div
              className="casting-client-search-segments"
              role="tablist"
              aria-label="Client result type"
            >
              {KIND_OPTIONS.map((option) => {
                const selected = kind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`casting-client-search-segments__tab${
                      selected ? " casting-client-search-segments__tab--active" : ""
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => switchKind(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {!canSearch ? (
              <p className="project-create__location-hint">Keep typing to search…</p>
            ) : null}
            {canSearch && loading ? (
              <p className="project-create__location-hint">Searching…</p>
            ) : null}
            {error ? <p className="project-create__location-error">{error}</p> : null}
            {canSearch && !loading && !error && results.length === 0 ? (
              <p className="project-create__location-hint">
                No matches. You can leave the typed name as-is.
              </p>
            ) : null}

            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => selectResult(result)}
                className="project-create__location-option"
              >
                <span className="flex items-center gap-2 text-left">
                  {result.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.imageUrl}
                      alt=""
                      className="size-7 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="size-7 shrink-0 rounded bg-[var(--line)]" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{result.name}</span>
                    {result.subtitle ? (
                      <span className="block truncate text-xs text-[var(--ink-soft)]">
                        {result.subtitle}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </AuthField>
  );
}
