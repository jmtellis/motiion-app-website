"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

import { AuthField, AuthInput } from "@/components/auth/ui";
import { setupPill } from "@/lib/setup-flow/form-styles";
import {
  marketLabelFromPlace,
  suggestedMarkets,
} from "@/lib/talent-buyers/onboarding";
import type { TalentBuyerMarketPlace } from "@/types/talent-buyers";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

type PlacePrediction = {
  description: string;
  placeId: string;
};

type SelectedPlacePayload = {
  placeId: string;
  name: string;
  formattedAddress: string;
  displayLabel: string;
  city: string | null;
  region: string | null;
  country: string | null;
  address: string | null;
};

function toMarketPlace(place: SelectedPlacePayload): TalentBuyerMarketPlace {
  return {
    placeId: place.placeId,
    city: place.city,
    region: place.region,
    country: place.country,
    displayLabel: place.displayLabel || place.formattedAddress || place.name,
  };
}

async function fetchPredictions(query: string, signal?: AbortSignal): Promise<PlacePrediction[]> {
  const response = await fetch(
    `/api/places/autocomplete?input=${encodeURIComponent(query.trim())}&mode=cities`,
    { signal },
  );
  const payload = (await response.json()) as {
    predictions?: PlacePrediction[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Location search failed.");
  }
  return payload.predictions ?? [];
}

async function resolvePlace(placeId: string): Promise<SelectedPlacePayload> {
  const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
  const payload = (await response.json()) as {
    place?: SelectedPlacePayload;
    error?: string;
  };
  if (!response.ok || !payload.place) {
    throw new Error(payload.error ?? "Could not load place details.");
  }
  return payload.place;
}

export function MarketPlacesSelector({
  places,
  onChange,
}: {
  places: TalentBuyerMarketPlace[];
  onChange: (places: TalentBuyerMarketPlace[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvingChip, setResolvingChip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchPredictions(query, controller.signal);
        setPredictions(next);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Location search failed.");
        setPredictions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  function addPlace(place: TalentBuyerMarketPlace) {
    if (places.some((item) => item.placeId === place.placeId)) {
      setError("That market is already selected.");
      return;
    }
    onChange([...places, place]);
    setQuery("");
    setPredictions([]);
    setOpen(false);
    setError(null);
  }

  async function selectPrediction(prediction: PlacePrediction) {
    setResolving(true);
    setError(null);
    try {
      const place = await resolvePlace(prediction.placeId);
      addPlace(toMarketPlace(place));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load place details.");
    } finally {
      setResolving(false);
    }
  }

  async function selectSuggestedMarket(label: string) {
    if (places.some((item) => marketLabelFromPlace(item).startsWith(label))) {
      onChange(
        places.filter((item) => !marketLabelFromPlace(item).toLowerCase().startsWith(label.toLowerCase())),
      );
      return;
    }

    setResolvingChip(label);
    setError(null);
    try {
      const predictionsForChip = await fetchPredictions(label);
      const match =
        predictionsForChip.find((item) =>
          item.description.toLowerCase().startsWith(label.toLowerCase()),
        ) ?? predictionsForChip[0];
      if (!match) {
        setError(`Could not resolve ${label} through Google Places.`);
        return;
      }
      const place = await resolvePlace(match.placeId);
      addPlace(toMarketPlace(place));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : `Could not resolve ${label}.`);
    } finally {
      setResolvingChip(null);
    }
  }

  return (
    <div className="space-y-4">
      <AuthField label="Primary market">
        <div ref={containerRef} className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-soft)]" />
          <AuthInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (predictions[0]) {
                  void selectPrediction(predictions[0]);
                }
              }
            }}
            placeholder="Search for a city"
            className="pl-10"
            autoComplete="off"
            disabled={resolving}
          />

          {open && (loading || resolving || predictions.length > 0 || error) ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-card)] shadow-[var(--shadow-raised)]">
              {loading || resolving ? (
                <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">
                  {resolving ? "Loading place…" : "Searching…"}
                </p>
              ) : null}
              {error ? <p className="px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              {predictions.map((prediction) => (
                <button
                  key={prediction.placeId || prediction.description}
                  type="button"
                  onClick={() => {
                    void selectPrediction(prediction);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-[var(--ink)] hover:bg-[var(--tone)]"
                >
                  {prediction.description}
                </button>
              ))}
              {predictions.length > 0 ? (
                <p className="border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-soft)]">
                  Powered by Google
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </AuthField>

      <div className="flex flex-wrap gap-2">
        {suggestedMarkets.map((market) => {
          const selected = places.some((item) =>
            marketLabelFromPlace(item).toLowerCase().startsWith(market.toLowerCase()),
          );
          return (
            <button
              key={market}
              type="button"
              onClick={() => {
                void selectSuggestedMarket(market);
              }}
              disabled={resolvingChip === market}
              className={setupPill(selected)}
            >
              {resolvingChip === market ? "Resolving…" : market}
            </button>
          );
        })}
      </div>

      {error && !open ? <p className="text-sm text-rose-700">{error}</p> : null}

      {places.length ? (
        <div className="flex flex-wrap gap-2">
          {places.map((place) => (
            <span
              key={place.placeId}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm text-[var(--ink)]"
            >
              {marketLabelFromPlace(place)}
              <button
                type="button"
                aria-label={`Remove ${marketLabelFromPlace(place)}`}
                onClick={() => onChange(places.filter((item) => item.placeId !== place.placeId))}
                className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
