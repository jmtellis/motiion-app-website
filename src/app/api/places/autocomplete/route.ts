import { NextResponse } from "next/server";
import { searchNominatimCities, type PlacePrediction } from "@/lib/places/nominatim";

const MIN_QUERY_LENGTH = 3;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";

  if (input.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ predictions: [] satisfies PlacePrediction[] });
  }

  try {
    const predictions = await searchNominatimCities(input);
    return NextResponse.json({ predictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Location search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
