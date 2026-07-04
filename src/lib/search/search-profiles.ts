import { cache } from "react";

import { mockTalentProfiles, portraitWallImages } from "@/lib/mock-data";
import { getSupabaseConfig, supabaseRestGet } from "@/lib/supabaseRest";
import {
  filterSearchProfiles,
  normalizeSearchProfile,
} from "@/lib/search/talent-filter-logic";
import type { SearchFilters, SearchProfileRecord, SearchResult } from "@/types/search";

const PAGE_SIZE = 12;
const DISCOVER_FETCH_LIMIT = 120;
const NAVIGATOR_FETCH_LIMIT = 240;

const TALENT_SELECT = [
  "id",
  "username",
  "full_name",
  "headshot_url",
  "headshot_urls",
  "gender",
  "ethnicity",
  "height",
  "talent_types",
  "styles",
  "skills",
  "representation",
  "location",
  "union_status",
  "eye_color",
  "hair_color",
  "profile_highlights",
  "bio",
  "agency_logo_url",
].join(",");

function emptySearchResult(filters: SearchFilters): SearchResult {
  return {
    ...paginate([], filters.page ?? 1),
    usingFallbackData: false,
    source: "unavailable",
  };
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

function encodeIlike(value: string) {
  return encodeURIComponent(`%${value.trim()}%`);
}

function genderVariants(gender: string) {
  const trimmed = gender.trim();
  return [...new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase(), capitalize(trimmed)])];
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const KEYSET_BATCH_SIZE = 100;

function buildTalentQueryPath(filters: SearchFilters, cursor: string | null): string {
  // Keyset pagination: stable order on id, cursor past the last-seen id.
  const params = [`select=${TALENT_SELECT}`, "order=id.asc", `limit=${KEYSET_BATCH_SIZE}`];

  if (cursor) {
    params.push(`id=gt.${encodeURIComponent(cursor)}`);
  }

  const keyword = filters.keyword?.trim();
  if (keyword) {
    const pattern = encodeIlike(keyword);
    params.push(`or=(full_name.ilike.${pattern},representation.ilike.${pattern},location.ilike.${pattern})`);
  }

  if (filters.gender?.trim()) {
    const variants = genderVariants(filters.gender).map((value) => `"${value.replace(/"/g, '\\"')}"`);
    params.push(`gender=in.(${variants.join(",")})`);
  }

  if (filters.unionStatus?.trim()) {
    params.push(`union_status=eq.${encodeURIComponent(filters.unionStatus.trim())}`);
  }

  if (filters.agency?.trim()) {
    params.push(`representation=ilike.${encodeIlike(filters.agency)}`);
  }

  if (filters.representation === "Represented") {
    params.push("representation=not.is.null");
  }

  return `talent?${params.join("&")}`;
}

function sortByName(profiles: SearchProfileRecord[]): SearchProfileRecord[] {
  return [...profiles].sort((a, b) =>
    (a.full_name ?? a.display_name ?? "").localeCompare(b.full_name ?? b.display_name ?? ""),
  );
}

/**
 * Fetch talent in keyset-paginated batches (cursored on id), applying in-memory
 * refinement filters between batches, until we have enough rows or run out.
 */
async function queryTalent(filters: SearchFilters): Promise<SearchProfileRecord[] | null> {
  if (!getSupabaseConfig()) return null;

  const fetchLimit = filters.navigator ? NAVIGATOR_FETCH_LIMIT : DISCOVER_FETCH_LIMIT;
  const neededFiltered = filters.navigator
    ? NAVIGATOR_FETCH_LIMIT
    : Math.max(filters.page ?? 1, 1) * PAGE_SIZE + 1;

  const collected: SearchProfileRecord[] = [];
  let filteredCount = 0;
  let cursor: string | null = null;
  let batchWasNull = true;

  while (collected.length < fetchLimit && filteredCount < neededFiltered) {
    const rows: SearchProfileRecord[] | null = await supabaseRestGet<SearchProfileRecord[]>(
      buildTalentQueryPath(filters, cursor),
      { revalidate: filters.navigator ? 0 : 120 },
    );
    if (!rows) break;
    batchWasNull = false;
    if (!rows.length) break;

    const normalized = rows.map(normalizeSearchProfile);
    collected.push(...normalized);
    filteredCount = filterSearchProfiles(collected, filters).length;

    cursor = rows[rows.length - 1]?.id ?? null;
    if (rows.length < KEYSET_BATCH_SIZE || !cursor) break;
  }

  if (batchWasNull && !collected.length) return null;
  return sortByName(collected);
}

async function querySupabaseView(
  viewName: "public_search_profiles" | "talent",
  filters: SearchFilters,
): Promise<SearchResult | null> {
  if (!getSupabaseConfig()) return null;

  if (viewName === "talent") {
    const rows = await queryTalent(filters);
    if (!rows) return null;

    const filtered = filterSearchProfiles(rows, filters);
    if (filters.navigator) {
      return {
        items: filtered,
        total: filtered.length,
        page: 1,
        pageSize: filtered.length,
        usingFallbackData: false,
        source: "talent",
      };
    }

    return {
      ...paginate(filtered, filters.page ?? 1),
      usingFallbackData: false,
      source: "talent",
    };
  }

  const rows = await supabaseRestGet<SearchProfileRecord[]>(`${viewName}?select=*&limit=${DISCOVER_FETCH_LIMIT}`, {
    revalidate: 120,
  });
  if (!rows) return null;

  const normalized = rows.map(normalizeSearchProfile);
  const filtered = filterSearchProfiles(normalized, filters);

  if (filters.navigator) {
    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      pageSize: filtered.length,
      usingFallbackData: false,
      source: viewName,
    };
  }

  return {
    ...paginate(filtered, filters.page ?? 1),
    usingFallbackData: false,
    source: viewName,
  };
}

async function queryProfessionalProfiles(filters: SearchFilters): Promise<SearchProfileRecord[] | null> {
  if (!getSupabaseConfig() || !filters.navigator) return null;

  const params = [
    "select=id,user_id,slug,styles,skills,gender,ethnicity,union_status,location_city,is_verified",
    "is_verified=eq.true",
    "order=location_city.asc",
    `limit=${NAVIGATOR_FETCH_LIMIT}`,
  ];

  const rows = await supabaseRestGet<
    Array<{
      id: string;
      user_id: string;
      slug: string;
      styles: string[] | null;
      skills: string[] | null;
      gender: string | null;
      ethnicity: string[] | null;
      union_status: string | null;
      location_city: string | null;
      is_verified: boolean;
    }>
  >(`professional_profiles?${params.join("&")}`, { revalidate: 0 });

  if (!rows?.length) return null;

  const mapped: SearchProfileRecord[] = rows.map((row) =>
    normalizeSearchProfile({
      id: row.user_id,
      username: row.slug,
      full_name: row.slug.replace(/-/g, " "),
      display_name: row.slug,
      location: row.location_city,
      styles: row.styles ?? [],
      skills: row.skills ?? [],
      gender: row.gender,
      ethnicity: row.ethnicity?.join(", ") ?? null,
      union_status: row.union_status,
      is_verified: row.is_verified,
    }),
  );

  return filterSearchProfiles(mapped, filters);
}

/** Verified professional profiles rank first; general talent pool fills in after (deduped). */
function mergeVerifiedFirst(
  verified: SearchProfileRecord[],
  general: SearchResult,
): SearchResult {
  if (!verified.length) return general;

  const seen = new Set(verified.map((profile) => profile.id));
  const rest = general.items.filter((profile) => !seen.has(profile.id));
  const items = [...verified, ...rest];

  return {
    ...general,
    items,
    total: items.length,
    pageSize: items.length,
  };
}

export const searchTalentProfiles = cache(async (filters: SearchFilters): Promise<SearchResult> => {
  const verifiedProfiles = (await queryProfessionalProfiles(filters)) ?? [];

  const talentProfiles = await querySupabaseView("talent", filters);
  if (talentProfiles) return mergeVerifiedFirst(verifiedProfiles, talentProfiles);

  if (verifiedProfiles.length) {
    return {
      items: verifiedProfiles,
      total: verifiedProfiles.length,
      page: 1,
      pageSize: verifiedProfiles.length,
      usingFallbackData: false,
      source: "talent",
    };
  }

  const publicProfiles = await querySupabaseView("public_search_profiles", filters);
  if (publicProfiles) return publicProfiles;

  if (!getSupabaseConfig()) {
    return emptySearchResult(filters);
  }

  const filtered = filterSearchProfiles(mockTalentProfiles.map(normalizeSearchProfile), filters);

  if (filters.navigator) {
    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      pageSize: filtered.length,
      usingFallbackData: true,
      source: "mock",
    };
  }

  return {
    ...paginate(filtered, filters.page ?? 1),
    usingFallbackData: true,
    source: "mock",
  };
});

type HeroHeadshotRow = {
  headshot_url?: string | null;
  headshot_urls?: string[] | null;
  headshot_original_urls?: string[] | null;
};

function heroHeadshotUrls(row: HeroHeadshotRow): string[] {
  const displayUrls = (Array.isArray(row.headshot_urls) ? row.headshot_urls : []).filter((value): value is string =>
    Boolean(value?.trim()),
  );
  if (displayUrls.length) return displayUrls;

  return (Array.isArray(row.headshot_original_urls) ? row.headshot_original_urls : []).filter(
    (value): value is string => Boolean(value?.trim()),
  );
}

function profileHeadshotSlots(row: HeroHeadshotRow): { first: string | null; second: string | null } {
  const urls = heroHeadshotUrls(row);
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

async function queryHeroHeadshotsFromProfiles(): Promise<string[] | null> {
  const rows = await supabaseRestGet<HeroHeadshotRow[]>(
    `profiles?select=headshot_urls,headshot_original_urls&onboarding_completed_at=not.is.null&headshot_urls=not.is.null&limit=48`,
    { revalidate: 600 },
  );
  if (!rows?.length) return null;

  const images = buildHeroHeadshotSequence(rows);
  return images.length ? images : null;
}

async function queryHeroHeadshots(viewName: "public_search_profiles" | "talent"): Promise<string[] | null> {
  const rows = await supabaseRestGet<HeroHeadshotRow[]>(
    `${viewName}?select=headshot_url,headshot_urls&limit=48`,
    { revalidate: 600 },
  );
  if (!rows?.length) return null;

  const images = buildHeroHeadshotSequence(rows);
  return images.length ? images : null;
}

export const getHeroHeadshotImages = cache(async () => {
  const profileImages = await queryHeroHeadshotsFromProfiles();
  if (profileImages?.length) return profileImages;

  const publicSearchImages = await queryHeroHeadshots("public_search_profiles");
  if (publicSearchImages?.length) return publicSearchImages;

  const talentImages = await queryHeroHeadshots("talent");
  if (talentImages?.length) return talentImages;

  const mockSequence = buildHeroHeadshotSequence(mockTalentProfiles);
  if (mockSequence.length >= 8) return mockSequence;

  return portraitWallImages;
});

/** Swipeable pillar stack on the home page (max 10 unique headshots). */
export const PILLAR_STACK_HEADSHOT_LIMIT = 10;

export const getPillarHeadshotImages = cache(async () => {
  const images = await getHeroHeadshotImages();
  return images.slice(0, PILLAR_STACK_HEADSHOT_LIMIT);
});
