import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  DEFAULT_NAVIGATOR_FILTER_OPTIONS,
  type NavigatorFilterOptions,
} from "./filter-options";

async function fetchLiveLocations(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("professional_profiles")
    .select("location_city, location_region")
    .not("location_city", "is", null)
    .limit(500);

  const seen = new Set<string>();
  const locations: string[] = [];
  for (const row of data ?? []) {
    const city = row.location_city?.trim();
    if (!city) continue;
    const label = row.location_region?.trim() ? `${city}, ${row.location_region.trim()}` : city;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(label);
  }
  return locations.sort((a, b) => a.localeCompare(b));
}

export async function fetchNavigatorFilterOptions(): Promise<NavigatorFilterOptions> {
  const [agencies, liveLocations] = await Promise.all([
    fetchTalentAgencies(),
    fetchLiveLocations(),
  ]);
  const agencyNames = agencies.map((agency) => agency.name).filter(Boolean);

  return {
    agencies: agencyNames.length ? agencyNames : DEFAULT_NAVIGATOR_FILTER_OPTIONS.agencies,
    locations: liveLocations.length ? liveLocations : DEFAULT_NAVIGATOR_FILTER_OPTIONS.locations,
  };
}
