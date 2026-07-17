import { NextResponse } from "next/server";

import { hasTmdbApiKey, searchTmdbProjects } from "@/lib/clients/tmdb-projects";
import type { ClientSearchResult } from "@/lib/clients/types";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] satisfies ClientSearchResult[] });
  }

  if (!hasTmdbApiKey()) {
    return NextResponse.json(
      { error: "TMDB API key is not configured.", results: [] },
      { status: 503 },
    );
  }

  try {
    const results = await searchTmdbProjects(query);
    return NextResponse.json({ results, provider: "tmdb" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project search failed.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
