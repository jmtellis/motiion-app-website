import type { ClientSearchResult } from "./types";

const TOKEN_REFRESH_BUFFER_SECONDS = 30;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 10;

let cachedToken = "";
let cachedTokenExp = 0;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasSpotifyCredentials(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim(),
  );
}

async function fetchSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("Spotify environment is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExp - TOKEN_REFRESH_BUFFER_SECONDS > now) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Spotify token request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const token = normalizeString(payload?.access_token);
  const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 3600;
  if (!token) {
    throw new Error("Spotify token response missing access_token.");
  }

  cachedToken = token;
  cachedTokenExp = now + expiresIn;
  return token;
}

function pickBestImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const ranked = images
    .map((image) => (image && typeof image === "object" ? (image as Record<string, unknown>) : null))
    .filter((image): image is Record<string, unknown> => image !== null)
    .sort((a, b) => {
      const aWidth = typeof a.width === "number" ? a.width : 0;
      const bWidth = typeof b.width === "number" ? b.width : 0;
      return bWidth - aWidth;
    });
  return normalizeString(ranked[0]?.url as string | undefined);
}

function mapArtist(item: Record<string, unknown>): ClientSearchResult | null {
  const id = normalizeString(item.id);
  const name = normalizeString(item.name);
  if (!id || !name) return null;

  const genres = Array.isArray(item.genres)
    ? item.genres
        .map((genre) => normalizeString(genre))
        .filter((genre): genre is string => genre !== null)
        .slice(0, 2)
        .join(", ")
    : "";

  return {
    id,
    name,
    subtitle: genres || "Artist",
    imageUrl: pickBestImage(item.images),
  };
}

export async function searchSpotifyArtists(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<ClientSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const clamped = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  const accessToken = await fetchSpotifyAccessToken();
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=artist&limit=${clamped}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Spotify artist search failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const artistsPayload = payload?.artists as Record<string, unknown> | undefined;
  const data = Array.isArray(artistsPayload?.items) ? artistsPayload.items : [];

  return data
    .map((item) =>
      item && typeof item === "object" ? mapArtist(item as Record<string, unknown>) : null,
    )
    .filter((item): item is ClientSearchResult => item !== null);
}
