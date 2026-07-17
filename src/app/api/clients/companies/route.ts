import { NextResponse } from "next/server";

import {
  hasBrandfetchClientId,
  searchBrandfetchCompanies,
} from "@/lib/clients/brandfetch-companies";
import type { ClientSearchResult } from "@/lib/clients/types";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] satisfies ClientSearchResult[] });
  }

  if (!hasBrandfetchClientId()) {
    return NextResponse.json(
      { error: "Brandfetch client ID is not configured.", results: [] },
      { status: 503 },
    );
  }

  try {
    const results = await searchBrandfetchCompanies(query);
    return NextResponse.json({ results, provider: "brandfetch" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Company search failed.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
