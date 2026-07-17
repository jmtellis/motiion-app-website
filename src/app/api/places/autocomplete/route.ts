import { NextResponse } from "next/server";

import {
  hasGooglePlacesApiKey,
  searchGooglePlaces,
  type PlacesSearchMode,
} from "@/lib/places/google-places";
import { searchNominatimCities, type PlacePrediction } from "@/lib/places/nominatim";

const MIN_QUERY_LENGTH = 3;

function parseMode(raw: string | null): PlacesSearchMode {
  return raw === "establishments" ? "establishments" : "cities";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";
  const mode = parseMode(searchParams.get("mode"));

  if (input.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ predictions: [] satisfies PlacePrediction[] });
  }

  try {
    if (hasGooglePlacesApiKey()) {
      const predictions = await searchGooglePlaces(input, mode);
      return NextResponse.json({ predictions, provider: "google" });
    }

    // Nominatim fallback is city-oriented.
    const predictions = await searchNominatimCities(input);
    return NextResponse.json({ predictions, provider: "nominatim" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Location search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
