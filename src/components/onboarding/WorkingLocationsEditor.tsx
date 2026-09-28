"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";

const MAX_OTHER_LOCATIONS = 4;
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

type PlacePrediction = {
  description: string;
  placeId: string;
};

function LocationSelector({
  label,
  value,
  placeholder,
  onChange,
}: {
  label?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [provider, setProvider] = useState("nominatim");
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!open || query.trim().length < MIN_SEARCH_LENGTH) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query.trim())}&mode=cities`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          predictions?: PlacePrediction[];
          error?: string;
          provider?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? "Location search failed.");
          setPredictions([]);
          return;
        }

        setProvider(payload.provider ?? "nominatim");
        setPredictions(payload.predictions ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Location search failed.");
        setPredictions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  return (
    <div ref={containerRef} className="space-y-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--ink-soft)]">{label}</label>
      ) : null}
      <div className="relative">
        <div className="workspace-input-shell flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-4 py-3">
          <MapPin className="size-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
          <input
            id={inputId}
            aria-label={label ?? "Working location"}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              onChange(event.target.value);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="workspace-bare-input min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
          />
        </div>

        {open && query.trim().length >= MIN_SEARCH_LENGTH ? (
          <div data-lenis-prevent className="mt-2 max-h-64 w-full overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] shadow-sm">
            {loading ? <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">Searching…</p> : null}
            {error ? <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">Search is unavailable. Enter your city and region manually below.</p> : null}
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId || prediction.description}
                type="button"
                onClick={() => {
                  onChange(prediction.description);
                  setQuery(prediction.description);
                  setOpen(false);
                }}
                className="block w-full px-4 py-3 text-left text-sm text-[var(--ink)] hover:bg-[var(--tone)]"
              >
                {prediction.description}
              </button>
            ))}
            <button type="button" onClick={() => { onChange(query.trim()); setOpen(false); }} className="block w-full border-t border-[var(--line)] px-4 py-3 text-left text-sm font-medium hover:bg-[var(--tone)]">Use “{query.trim()}” as my location</button>
            {predictions.length > 0 && provider === "google" ? <p className="px-4 py-2 text-xs text-[var(--ink-soft)]">Powered by Google</p> : null}
            {predictions.length > 0 && provider === "nominatim" ? (
              <p className="border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-soft)]">
                Location data ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  OpenStreetMap
                </a>{" "}
                contributors
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WorkingLocationsEditor({
  locations,
  onChange,
}: {
  locations: string[];
  onChange: (locations: string[]) => void;
}) {
  const primary = locations[0] ?? "";
  const others = locations.slice(1);

  function setPrimary(value: string) {
    const trimmed = value;
    const nextOthers = others.map((item) => item.trim()).filter(Boolean);
    onChange([trimmed, ...nextOthers]);
  }

  function setOther(index: number, value: string) {
    const next = [...others];
    if (index < next.length) {
      next[index] = value;
    } else {
      next.push(value);
    }
    onChange([primary, ...next]);
  }

  function removeOther(index: number) {
    const next = others.filter((_, itemIndex) => itemIndex !== index);
    onChange(primary.trim() ? [primary.trim(), ...next.map((item) => item.trim()).filter(Boolean)] : []);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--ink-soft)]">
        Choose your main location and add other places where you can work as a local.
      </p>

      <LocationSelector
        label="Primary location (required)"
        value={primary}
        placeholder="Search or enter city, state / region"
        onChange={setPrimary}
      />

      <p className="text-xs text-[var(--ink-soft)]">Choose a search result, or type your city and state / region to enter it manually.</p>
      <div className="editor-extra-list space-y-3 border-t border-[var(--line)] pt-5">
        {others.map((location, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <LocationSelector
                label={`Additional location ${index + 1}`}
                value={location}
                placeholder="Search or enter city, state / region"
                onChange={(value) => setOther(index, value)}
              />
            </div>
            <button
              type="button"
              aria-label="Remove location"
              onClick={() => removeOther(index)}
              className="mt-7 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--tone)] hover:text-[var(--ink)]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}

        {others.length < MAX_OTHER_LOCATIONS && primary.trim() ? (
          <button
            type="button"
            onClick={() => {
              const next = [...others, ""];
              onChange(primary.trim() ? [primary.trim(), ...next] : next);
            }}
            className="editor-add-button inline-flex items-center gap-2 ui-chip px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            <Plus className="size-4" aria-hidden />
            Add location
          </button>
        ) : null}
      </div>
    </div>
  );
}
