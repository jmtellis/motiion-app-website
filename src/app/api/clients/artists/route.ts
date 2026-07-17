import { NextResponse } from "next/server";

import { hasSpotifyCredentials, searchSpotifyArtists } from "@/lib/clients/spotify-artists";
import type { ClientSearchResult } from "@/lib/clients/types";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] satisfies ClientSearchResult[] });
  }

  if (!hasSpotifyCredentials()) {
    return NextResponse.json(
      { error: "Spotify credentials are not configured.", results: [] },
      { status: 503 },
    );
  }

  try {
    const results = await searchSpotifyArtists(query);
    return NextResponse.json({ results, provider: "spotify" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artist search failed.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
