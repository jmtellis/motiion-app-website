import { cache } from "react";

import { mockTalentProfiles, portraitWallImages } from "@/lib/mock-data";
import { getSupabaseConfig, supabaseRestGet } from "@/lib/supabaseRest";
import type { SearchFilters, SearchProfileRecord, SearchResult } from "@/types/search";

const PAGE_SIZE = 12;
/** Profiles to load — one primary (and optional secondary) headshot each. */
const HERO_PROFILE_LIMIT = 48;

function emptySearchResult(filters: SearchFilters): SearchResult {
  return {
    ...paginate([], filters.page ?? 1),
    usingFallbackData: false,
    source: "unavailable",
  };
}

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function filterProfiles(profiles: SearchProfileRecord[], filters: SearchFilters): SearchProfileRecord[] {
  const keyword = normalizeText(filters.keyword);
  const location = normalizeText(filters.location);
  const style = normalizeText(filters.style);
  const subtype = normalizeText(filters.subtype);

  return profiles.filter((profile) => {
    const haystack = [
      profile.full_name,
      profile.display_name,
      profile.location,
      profile.bio,
      ...(profile.talent_types ?? []),
      ...(profile.styles ?? []),
      ...(profile.skills ?? []),
      ...(profile.profile_highlights ?? []).flatMap((item) => [item.title, item.subtitle]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesKeyword = keyword ? haystack.includes(keyword) : true;
    const matchesLocation = location
      ? (profile.location ?? "").toLowerCase().includes(location)
      : true;
    const matchesStyle = style
      ? (profile.styles ?? []).some((item) => item.toLowerCase() === style)
      : true;
    const matchesSubtype = subtype
      ? (profile.talent_types ?? []).some((item) => item.toLowerCase() === subtype)
      : true;

    return matchesKeyword && matchesLocation && matchesStyle && matchesSubtype;
  });
}

function paginate(profiles: SearchProfileRecord[], page: number) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    items: profiles.slice(start, start + PAGE_SIZE),
    total: profiles.length,
    page: safePage,
    pageSize: PAGE_SIZE,
  };
}

async function querySupabaseView(
  viewName: "public_search_profiles" | "talent",
  filters: SearchFilters,
): Promise<SearchResult | null> {
  if (!getSupabaseConfig()) return null;

  const rows = await supabaseRestGet<SearchProfileRecord[]>(`${viewName}?select=*&limit=60`, {
    revalidate: 120,
  });
  if (!rows) return null;

  const normalized = rows.map((item) => ({
    ...item,
    display_name: item.display_name ?? item.full_name ?? null,
  }));

  const filtered = filterProfiles(normalized, filters);
  const paginated = paginate(filtered, filters.page ?? 1);

  return {
    ...paginated,
    usingFallbackData: false,
    source: viewName,
  };
}

export const searchTalentProfiles = cache(async (filters: SearchFilters): Promise<SearchResult> => {
  const publicProfiles = await querySupabaseView("public_search_profiles", filters);
  if (publicProfiles) return publicProfiles;

  const talentProfiles = await querySupabaseView("talent", filters);
  if (talentProfiles) return talentProfiles;

  if (!getSupabaseConfig()) {
    return emptySearchResult(filters);
  }

  const filtered = filterProfiles(mockTalentProfiles, filters);
  const paginated = paginate(filtered, filters.page ?? 1);
  return { ...paginated, usingFallbackData: true, source: "mock" };
});

type HeroHeadshotRow = {
  headshot_url?: string | null;
  headshot_urls?: string[] | null;
};

function profileHeadshotSlots(row: HeroHeadshotRow): { first: string | null; second: string | null } {
  const urls = (Array.isArray(row.headshot_urls) ? row.headshot_urls : []).filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const first = (urls[0] ?? row.headshot_url)?.trim() || null;
  const secondCandidate = urls[1]?.trim() || null;
  const second = secondCandidate && secondCandidate !== first ? secondCandidate : null;
  return { first, second };
}

/** One headshot per person first, then each person's second — avoids repeats in a column. */
export function buildHeroHeadshotSequence(rows: HeroHeadshotRow[]): string[] {
  const seen = new Set<string>();
  const primary: string[] = [];
  const secondary: string[] = [];

  for (const row of rows) {
    const { first } = profileHeadshotSlots(row);
    if (first && !seen.has(first)) {
      seen.add(first);
      primary.push(first);
    }
  }

  for (const row of rows) {
    const { second } = profileHeadshotSlots(row);
    if (second && !seen.has(second)) {
      seen.add(second);
      secondary.push(second);
    }
  }

  return [...primary, ...secondary];
}

async function queryHeroHeadshots(viewName: "public_search_profiles" | "talent"): Promise<string[] | null> {
  const rows = await supabaseRestGet<HeroHeadshotRow[]>(
    `${viewName}?select=headshot_url,headshot_urls&limit=${HERO_PROFILE_LIMIT}`,
    { revalidate: 600 },
  );
  if (!rows?.length) return null;

  const images = buildHeroHeadshotSequence(rows);
  return images.length ? images : null;
}

export const getHeroHeadshotImages = cache(async () => {
  const publicSearchImages = await queryHeroHeadshots("public_search_profiles");
  if (publicSearchImages?.length) return publicSearchImages;

  const talentImages = await queryHeroHeadshots("talent");
  if (talentImages?.length) return talentImages;

  const mockSequence = buildHeroHeadshotSequence(mockTalentProfiles);
  if (mockSequence.length >= 8) return mockSequence;

  return portraitWallImages;
});
