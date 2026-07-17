import type { ClientSearchResult } from "./types";

const DEFAULT_LIMIT = 8;
const POSTER_BASE = "https://image.tmdb.org/t/p/w185";

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function yearFromDate(raw: unknown): string | null {
  const value = normalizeString(raw);
  if (!value || value.length < 4) return null;
  return value.slice(0, 4);
}

export function hasTmdbApiKey(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim() || process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim());
}

function resolveCredential(): string | null {
  const raw = process.env.TMDB_API_KEY?.trim() || process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
  return raw || null;
}

function authHeaders(credential: string): HeadersInit {
  if (credential.startsWith("eyJ")) {
    return {
      Accept: "application/json",
      Authorization: `Bearer ${credential}`,
    };
  }
  return { Accept: "application/json" };
}

function buildSearchUrl(credential: string, query: string): string {
  const params = new URLSearchParams({
    query,
    include_adult: "false",
  });
  if (!credential.startsWith("eyJ")) {
    params.set("api_key", credential);
  }
  return `https://api.themoviedb.org/3/search/multi?${params.toString()}`;
}

function mapMultiItem(item: Record<string, unknown>): ClientSearchResult | null {
  const mediaType = normalizeString(item.media_type);
  if (mediaType !== "movie" && mediaType !== "tv") return null;

  const numericId = typeof item.id === "number" ? item.id : Number(item.id);
  if (!Number.isFinite(numericId)) return null;

  const title =
    normalizeString(item.title) ||
    normalizeString(item.name) ||
    normalizeString(item.original_title) ||
    normalizeString(item.original_name);
  if (!title) return null;

  const year =
    mediaType === "movie" ? yearFromDate(item.release_date) : yearFromDate(item.first_air_date);
  const posterPath = normalizeString(item.poster_path);
  const kindLabel = mediaType === "movie" ? "Film" : "TV";

  return {
    id: `${mediaType}-${numericId}`,
    name: title,
    subtitle: year ? `${kindLabel} · ${year}` : kindLabel,
    imageUrl: posterPath ? `${POSTER_BASE}${posterPath}` : null,
  };
}

export async function searchTmdbProjects(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<ClientSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const credential = resolveCredential();
  if (!credential) {
    throw new Error("TMDB API key is not configured.");
  }

  const response = await fetch(buildSearchUrl(credential, trimmed), {
    method: "GET",
    headers: authHeaders(credential),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`TMDB search failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const out: ClientSearchResult[] = [];

  for (const item of results) {
    if (out.length >= limit) break;
    if (!item || typeof item !== "object") continue;
    const mapped = mapMultiItem(item as Record<string, unknown>);
    if (mapped) out.push(mapped);
  }

  return out;
}
