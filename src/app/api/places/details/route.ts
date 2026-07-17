import { NextResponse } from "next/server";

import { getGooglePlaceDetails, hasGooglePlacesApiKey } from "@/lib/places/google-places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim() ?? "";

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required." }, { status: 400 });
  }

  if (!hasGooglePlacesApiKey()) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const place = await getGooglePlaceDetails(placeId);
    return NextResponse.json({ place });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Place details lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
