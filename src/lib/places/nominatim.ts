/**
 * OpenStreetMap Nominatim search + normalization to match iOS CitySearchPicker:
 * "Los Angeles, CA" (locality + short administrative area when available).
 */

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  borough?: string;
  state?: string;
  state_district?: string;
  country?: string;
  country_code?: string;
  "ISO3166-2-lvl4"?: string;
};

export type NominatimSearchResult = {
  place_id: number | string;
  display_name?: string;
  class?: string; // Nominatim JSON field name
  type?: string;
  importance?: number;
  address?: NominatimAddress;
};

export type PlacePrediction = {
  description: string;
  placeId: string;
};

const US_STATE_TO_ABBREV: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const CITY_LIKE_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "borough",
  "hamlet",
  "suburb",
  "administrative",
]);

function getLocality(address: NominatimAddress): string | null {
  const name =
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.municipality?.trim() ||
    address.borough?.trim();

  return name || null;
}

function getAdministrativeArea(address: NominatimAddress): string | null {
  const iso = address["ISO3166-2-lvl4"]?.trim();
  if (iso?.includes("-")) {
    const segment = iso.split("-").pop();
    if (segment && segment.length >= 2 && segment.length <= 3) {
      return segment.toUpperCase();
    }
  }

  const state = address.state?.trim() || address.state_district?.trim();
  if (!state) return null;

  const country = address.country_code?.toLowerCase();
  if (country === "us") {
    if (state.length === 2) return state.toUpperCase();
    return US_STATE_TO_ABBREV[state] ?? state;
  }

  return state;
}

/**
 * Format a Nominatim hit as a working location string (iOS CitySearchPicker parity).
 */
export function normalizeWorkingLocation(result: NominatimSearchResult): string | null {
  const address = result.address;
  if (!address) return null;

  const locality = getLocality(address);
  if (locality) {
    const region = getAdministrativeArea(address);
    if (region && region.toLowerCase() !== locality.toLowerCase()) {
      return `${locality}, ${region}`;
    }
    return locality;
  }

  const fallback = result.display_name?.split(",")[0]?.trim();
  return fallback || null;
}

function isCityLikeResult(result: NominatimSearchResult): boolean {
  if (!result.address || !getLocality(result.address)) {
    return false;
  }

  const type = result.type?.toLowerCase() ?? "";
  const klass = result.class?.toLowerCase() ?? "";

  if (klass === "place" && CITY_LIKE_TYPES.has(type)) {
    return true;
  }

  if (klass === "boundary" && (type === "administrative" || type === "city")) {
    return true;
  }

  return Boolean(getLocality(result.address));
}

export function nominatimResultsToPredictions(results: NominatimSearchResult[]): PlacePrediction[] {
  const seen = new Set<string>();
  const predictions: PlacePrediction[] = [];

  for (const result of results) {
    if (!isCityLikeResult(result)) continue;

    const description = normalizeWorkingLocation(result);
    if (!description) continue;

    const key = description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    predictions.push({
      description,
      placeId: String(result.place_id),
    });
  }

  return predictions;
}

export function buildNominatimUserAgent(): string {
  const configured = process.env.NOMINATIM_USER_AGENT?.trim();
  if (configured) return configured;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.motiion.app";
  return `MotiionWeb/1.0 (${site}; onboarding location search)`;
}

export async function searchNominatimCities(
  query: string,
  options?: { baseUrl?: string },
): Promise<PlacePrediction[]> {
  const base = (
    options?.baseUrl ??
    process.env.NOMINATIM_BASE_URL?.trim() ??
    "https://nominatim.openstreetmap.org"
  ).replace(
    /\/$/,
    "",
  );

  const url = new URL(`${base}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("featuretype", "city");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": buildNominatimUserAgent(),
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Location search failed (${response.status}).`);
  }

  const results = (await response.json()) as NominatimSearchResult[];
  if (!Array.isArray(results)) {
    return [];
  }

  return nominatimResultsToPredictions(results);
}
