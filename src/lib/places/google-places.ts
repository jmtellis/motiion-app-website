import type { PlacePrediction } from "@/lib/places/nominatim";

export type PlacesSearchMode = "cities" | "establishments";

export type ResolvedPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  displayLabel: string;
  city: string | null;
  region: string | null;
  country: string | null;
  address: string | null;
};

type GoogleAutocompletePrediction = {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlaceDetailsResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

export function hasGooglePlacesApiKey(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

function componentByType(components: GoogleAddressComponent[], type: string): GoogleAddressComponent | null {
  return components.find((component) => component.types.includes(type)) ?? null;
}

function buildDisplayLabel(name: string, city: string | null, region: string | null, formattedAddress: string) {
  const locality = [city, region].filter(Boolean).join(", ");
  if (name && locality) return `${name} — ${locality}`;
  if (name && formattedAddress) return `${name} — ${formattedAddress}`;
  return name || formattedAddress;
}

function resolveAddressParts(components: GoogleAddressComponent[] = []) {
  const city =
    componentByType(components, "locality")?.long_name ||
    componentByType(components, "postal_town")?.long_name ||
    componentByType(components, "sublocality")?.long_name ||
    null;
  const region =
    componentByType(components, "administrative_area_level_1")?.short_name ||
    componentByType(components, "administrative_area_level_1")?.long_name ||
    null;
  const country = componentByType(components, "country")?.long_name || null;
  const streetNumber = componentByType(components, "street_number")?.long_name;
  const route = componentByType(components, "route")?.long_name;
  const address = [streetNumber, route].filter(Boolean).join(" ") || null;

  return { city, region, country, address };
}

export async function searchGooglePlaces(
  query: string,
  mode: PlacesSearchMode = "establishments",
): Promise<PlacePrediction[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured.");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("types", mode === "cities" ? "(cities)" : "establishment");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Google Places autocomplete failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    predictions?: GoogleAutocompletePrediction[];
  };

  if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    throw new Error(payload.error_message || `Google Places autocomplete status: ${payload.status}`);
  }

  return (payload.predictions ?? [])
    .filter((prediction) => prediction.place_id && prediction.description)
    .map((prediction) => ({
      description: prediction.description as string,
      placeId: prediction.place_id as string,
    }));
}

export async function getGooglePlaceDetails(placeId: string): Promise<ResolvedPlace> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured.");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,name,formatted_address,address_component");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Google Places details failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    result?: GooglePlaceDetailsResult;
  };

  if (payload.status && payload.status !== "OK") {
    throw new Error(payload.error_message || `Google Places details status: ${payload.status}`);
  }

  const result = payload.result;
  if (!result?.place_id) {
    throw new Error("Google Places details returned no place.");
  }

  const name = result.name?.trim() || "";
  const formattedAddress = result.formatted_address?.trim() || "";
  const parts = resolveAddressParts(result.address_components);

  return {
    placeId: result.place_id,
    name,
    formattedAddress,
    displayLabel: buildDisplayLabel(name, parts.city, parts.region, formattedAddress),
    city: parts.city,
    region: parts.region,
    country: parts.country,
    address: parts.address,
  };
}
