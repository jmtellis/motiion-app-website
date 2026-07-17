"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

type PlacePrediction = {
  description: string;
  placeId: string;
};

export type SelectedPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  displayLabel: string;
  city: string | null;
  region: string | null;
  country: string | null;
  address: string | null;
};

export type LocationAutocompleteMode = "cities" | "establishments";

export function LocationAutocomplete({
  label,
  value,
  placeholder,
  mode = "cities",
  onChange,
  onPlaceSelect,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  mode?: LocationAutocompleteMode;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: SelectedPlace) => void;
}) {
  const resolvedPlaceholder =
    placeholder ??
    (mode === "establishments" ? "Search for a studio or venue" : "Search for a city");
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
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
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(query.trim())}&mode=${mode}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          predictions?: PlacePrediction[];
          error?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? "Location search failed.");
          setPredictions([]);
          return;
        }

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
  }, [open, query, mode]);

  async function selectPrediction(prediction: PlacePrediction) {
    setOpen(false);
    setPredictions([]);
    onChange(prediction.description);
    setQuery(prediction.description);

    if (!onPlaceSelect) return;

    setResolving(true);
    setError(null);
    try {
      const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const payload = (await response.json()) as {
        place?: SelectedPlace;
        error?: string;
      };

      if (!response.ok || !payload.place) {
        // Fall back to description-only selection when details are unavailable.
        onPlaceSelect({
          placeId: prediction.placeId,
          name: prediction.description,
          formattedAddress: prediction.description,
          displayLabel: prediction.description,
          city: null,
          region: null,
          country: null,
          address: null,
        });
        if (!response.ok) {
          setError(payload.error ?? "Could not load place details.");
        }
        return;
      }

      onChange(payload.place.displayLabel);
      setQuery(payload.place.displayLabel);
      onPlaceSelect(payload.place);
    } catch (fetchError) {
      onPlaceSelect({
        placeId: prediction.placeId,
        name: prediction.description,
        formattedAddress: prediction.description,
        displayLabel: prediction.description,
        city: null,
        region: null,
        country: null,
        address: null,
      });
      setError(fetchError instanceof Error ? fetchError.message : "Could not load place details.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div ref={containerRef} className="project-create__field">
      {label ? <span className="project-create__label">{label}</span> : null}
      <div className="relative">
        <div className="project-create__location-shell">
          <MapPin className="project-create__location-icon" aria-hidden />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={resolvedPlaceholder}
            className="project-create__location-input"
            autoComplete="off"
          />
        </div>

        {open && (loading || resolving || predictions.length > 0 || error) ? (
          <div className="project-create__location-dropdown">
            {loading || resolving ? (
              <p className="project-create__location-hint">{resolving ? "Loading place…" : "Searching…"}</p>
            ) : null}
            {error ? <p className="project-create__location-error">{error}</p> : null}
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId || prediction.description}
                type="button"
                onClick={() => {
                  void selectPrediction(prediction);
                }}
                className="project-create__location-option"
              >
                {prediction.description}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
