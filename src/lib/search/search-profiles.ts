import { cache } from "react";

import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { mockTalentProfiles, portraitWallImages } from "@/lib/mock-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseConfig, supabaseRestGet } from "@/lib/supabaseRest";
import {
  filterSearchProfiles,
  genderFilterVariants,
  normalizeSearchProfile,
} from "@/lib/search/talent-filter-logic";
import type { SearchFilters, SearchProfileRecord, SearchResult } from "@/types/search";

const PAGE_SIZE = 12;
const DISCOVER_FETCH_LIMIT = 120;
const NAVIGATOR_FETCH_LIMIT = 240;
const SIGNED_URL_TTL = 60 * 60;

type ProfessionalProfileRow = {
  id: string;
  user_id: string;
  slug: string;
  styles: string[] | null;
  skills: string[] | null;
  gender: string | null;
  ethnicity: string[] | null;
  union_status: string | null;
  location_city: string | null;
  location_region: string | null;
  is_verified: boolean;
  agency_name: string | null;
};

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveDisplayName(
  profile:
    | {
        display_name: string | null;
        first_name: string | null;
        last_name: string | null;
      }
    | undefined,
  slug: string,
): string {
  const fromProfile =
    profile?.display_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return fromProfile || titleCaseSlug(slug);
}

function resolveProfileHeadshotUrl(
  headshotUrls: string[] | null | undefined,
  signedMediaUrl: string | null,
  mediaUrl: string | null,
): string | null {
  const fromOnboarding = getProfileAvatarUrl(headshotUrls);
  if (fromOnboarding) return fromOnboarding;
  if (signedMediaUrl?.trim()) return signedMediaUrl.trim();
  if (mediaUrl?.trim()) return mediaUrl.trim();
  return null;
}

function mapProfessionalProfileRow(
  row: ProfessionalProfileRow,
  userProfile:
    | {
        display_name: string | null;
        first_name: string | null;
        last_name: string | null;
        headshot_urls: string[] | null;
      }
    | undefined,
  signedMediaUrl: string | null,
  mediaUrl: string | null,
): SearchProfileRecord {
  const displayName = resolveDisplayName(userProfile, row.slug);
  const headshotUrl = resolveProfileHeadshotUrl(
    userProfile?.headshot_urls ?? null,
    signedMediaUrl,
    mediaUrl,
  );
  const location = row.location_city
    ? row.location_region?.trim()
      ? `${row.location_city}, ${row.location_region.trim()}`
      : row.location_city
    : null;

  return normalizeSearchProfile({
    id: row.user_id,
    professional_profile_id: row.id,
    username: row.slug,
    full_name: displayName,
    display_name: displayName,
    headshot_url: headshotUrl,
    headshot_urls: headshotUrl ? [headshotUrl] : null,
    location,
    styles: row.styles ?? [],
    skills: row.skills ?? [],
    gender: row.gender,
    ethnicity: row.ethnicity?.join(", ") ?? null,
    union_status: row.union_status,
    is_verified: row.is_verified,
    representation: row.agency_name,
  });
}

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
  return genderFilterVariants(gender);
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

const PROFESSIONAL_PROFILE_SELECT =
  "id,user_id,slug,styles,skills,gender,ethnicity,union_status,location_city,location_region,is_verified,agency_name";

function buildProfessionalProfilesQueryPath(filters: SearchFilters, cursor: string | null): string {
  const params = [
    `select=${PROFESSIONAL_PROFILE_SELECT}`,
    "is_verified=eq.true",
    "order=id.asc",
    `limit=${KEYSET_BATCH_SIZE}`,
  ];

  if (cursor) {
    params.push(`id=gt.${encodeURIComponent(cursor)}`);
  }

  if (filters.gender?.trim()) {
    const variants = genderVariants(filters.gender).map((value) => `"${value.replace(/"/g, '\\"')}"`);
    params.push(`gender=in.(${variants.join(",")})`);
  }

  return `professional_profiles?${params.join("&")}`;
}

async function enrichProfessionalProfileRows(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  rows: ProfessionalProfileRow[],
): Promise<SearchProfileRecord[]> {
  const userIds = rows.map((row) => row.user_id);
  const profileIds = rows.map((row) => row.id);

  const [{ data: profiles }, { data: headshots }] = await Promise.all([
    userIds.length
      ? admin
          .from("profiles")
          .select("user_id, display_name, first_name, last_name, headshot_urls")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as never[] }),
    profileIds.length
      ? admin
          .from("media_assets")
          .select("profile_id, storage_path, url, position")
          .in("profile_id", profileIds)
          .eq("kind", "headshot")
          .order("position")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  const primaryHeadshot = new Map<string, { storage_path: string; url: string | null }>();
  for (const asset of headshots ?? []) {
    if (!primaryHeadshot.has(asset.profile_id)) {
      primaryHeadshot.set(asset.profile_id, {
        storage_path: asset.storage_path,
        url: asset.url,
      });
    }
  }

  const paths = [...primaryHeadshot.values()]
    .map((asset) => asset.storage_path)
    .filter(Boolean);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await admin.storage.from("media").createSignedUrls(paths, SIGNED_URL_TTL);
    signed?.forEach((entry, index) => {
      if (entry.signedUrl) signedByPath.set(paths[index], entry.signedUrl);
    });
  }

  return rows.map((row) => {
    const userProfile = profileByUserId.get(row.user_id);
    const media = primaryHeadshot.get(row.id);
    const signedMediaUrl = media?.storage_path
      ? (signedByPath.get(media.storage_path) ?? null)
      : null;

    return mapProfessionalProfileRow(row, userProfile, signedMediaUrl, media?.url ?? null);
  });
}

async function fetchProfessionalProfileBatchAdmin(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  filters: SearchFilters,
  cursor: string | null,
): Promise<ProfessionalProfileRow[] | null> {
  let query = admin
    .from("professional_profiles")
    .select(PROFESSIONAL_PROFILE_SELECT)
    .eq("is_verified", true)
    .order("id", { ascending: true })
    .limit(KEYSET_BATCH_SIZE);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  if (filters.gender?.trim()) {
    query = query.in("gender", genderFilterVariants(filters.gender));
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;
  return data as ProfessionalProfileRow[];
}

async function fetchProfessionalProfileBatchRest(
  filters: SearchFilters,
  cursor: string | null,
): Promise<ProfessionalProfileRow[] | null> {
  if (!getSupabaseConfig()) return null;

  const rows = await supabaseRestGet<ProfessionalProfileRow[]>(
    buildProfessionalProfilesQueryPath(filters, cursor),
    { revalidate: 0 },
  );

  return rows?.length ? rows : null;
}

/**
 * Fetch verified professional profiles in keyset-paginated batches with SQL gender
 * filtering, applying in-memory refinement between batches until enough matches or exhausted.
 */
async function queryProfessionalProfiles(filters: SearchFilters): Promise<SearchProfileRecord[] | null> {
  if (!filters.navigator) return null;

  const admin = createAdminSupabaseClient();
  const collected: SearchProfileRecord[] = [];
  const rawByUserId = new Map<string, ProfessionalProfileRow>();
  let filteredCount = 0;
  let cursor: string | null = null;
  let batchWasNull = true;

  while (collected.length < NAVIGATOR_FETCH_LIMIT && filteredCount < NAVIGATOR_FETCH_LIMIT) {
    const batch: ProfessionalProfileRow[] | null = admin
      ? await fetchProfessionalProfileBatchAdmin(admin, filters, cursor)
      : await fetchProfessionalProfileBatchRest(filters, cursor);
    if (!batch) break;
    batchWasNull = false;
    if (!batch.length) break;

    for (const row of batch) {
      rawByUserId.set(row.user_id, row);
    }

    const normalized = batch.map((row) => mapProfessionalProfileRow(row, undefined, null, null));
    collected.push(...normalized);
    filteredCount = filterSearchProfiles(collected, filters).length;

    cursor = batch[batch.length - 1]?.id ?? null;
    if (batch.length < KEYSET_BATCH_SIZE || !cursor) break;
  }

  if (batchWasNull && !collected.length) return null;

  const filtered = filterSearchProfiles(sortByName(collected), filters);
  if (!filtered.length) return [];

  if (!admin) return filtered;

  const rowsToEnrich = filtered
    .map((profile) => rawByUserId.get(profile.id))
    .filter((row): row is ProfessionalProfileRow => Boolean(row));

  if (!rowsToEnrich.length) return filtered;

  const enriched = await enrichProfessionalProfileRows(admin, rowsToEnrich);
  const enrichedByUserId = new Map(enriched.map((profile) => [profile.id, profile]));

  return filtered.map((profile) => enrichedByUserId.get(profile.id) ?? profile);
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
