import { cache } from "react";

import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { mockTalentProfiles, portraitWallImages } from "@/lib/mock-data";
import { readLiveSearchProfiles } from "@/lib/catalog/live-catalog";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseConfig, supabaseRestGet, supabaseRestGetCounted } from "@/lib/supabaseRest";
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
  subtype: string | null;
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

const TALENT_SUBTYPES = ["dancer", "choreographer", "instructor"] as const;

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

  const subtype = row.subtype?.trim().toLowerCase() ?? "";
  const talentTypes =
    subtype === "dancer" || subtype === "choreographer" || subtype === "instructor"
      ? [subtype]
      : [];

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
    talent_types: talentTypes,
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
  "id,user_id,slug,subtype,styles,skills,gender,ethnicity,union_status,location_city,location_region,is_verified,agency_name";

/** Talent-only verified profile source (excludes industry professionals). */
export function buildProfessionalProfilesQueryPath(filters: SearchFilters, cursor: string | null): string {
  const subtypeFilter = TALENT_SUBTYPES.map((value) => `"${value}"`).join(",");
  const params = [
    `select=${PROFESSIONAL_PROFILE_SELECT}`,
    "is_verified=eq.true",
    `subtype=in.(${subtypeFilter})`,
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

  return `talent_professional_profiles?${params.join("&")}`;
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
    .from("talent_professional_profiles")
    .select(PROFESSIONAL_PROFILE_SELECT)
    .eq("is_verified", true)
    .in("subtype", [...TALENT_SUBTYPES])
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

export const BROWSE_PAGE_SIZE = 24;

/** Keys match `HEIGHT_OPTIONS`. */
const BROWSE_HEIGHT_RANGES: Record<string, string[]> = {
  "Under 5'6\"": ["lt.66"],
  "5'6\" – 5'9\"": ["gte.66", "lte.69"],
  "5'10\" and above": ["gte.70"],
};

function spellingVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const titled = trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
  const base = [trimmed, titled];
  return [...new Set(base.flatMap((item) => [item, item.replace(/-/g, " "), item.replace(/ /g, "-")]))];
}

function jsonbContainsAny(column: string, values: string[]): string[] {
  return values.map((value) => `${column}.cs.${encodeURIComponent(JSON.stringify([value]))}`);
}

function buildBrowseQueryPath(filters: SearchFilters, page: number): string {
  const params = [
    `select=${TALENT_SELECT}`,
    "order=full_name.asc.nullslast,id.asc",
    `limit=${BROWSE_PAGE_SIZE}`,
    `offset=${(page - 1) * BROWSE_PAGE_SIZE}`,
  ];
  const groups: string[] = [];

  const keyword = filters.keyword?.trim();
  if (keyword) {
    const pattern = encodeIlike(keyword);
    const tagVariants = spellingVariants(keyword);
    groups.push(
      `or(${[
        `full_name.ilike.${pattern}`,
        `username.ilike.${pattern}`,
        `representation.ilike.${pattern}`,
        ...jsonbContainsAny("styles", tagVariants),
        ...jsonbContainsAny("skills", tagVariants),
      ].join(",")})`,
    );
  }

  const location = filters.location?.trim();
  if (location) params.push(`location=ilike.${encodeIlike(location)}`);

  const subtype = filters.subtype?.trim().toLowerCase();
  if (subtype) groups.push(`or(${jsonbContainsAny("talent_types", spellingVariants(subtype)).join(",")})`);

  const styles = (filters.styles?.length ? filters.styles : filters.style ? [filters.style] : []).flatMap(spellingVariants);
  if (styles.length) groups.push(`or(${jsonbContainsAny("styles", styles).join(",")})`);

  const skills = (filters.skills ?? []).flatMap(spellingVariants);
  if (skills.length) groups.push(`or(${jsonbContainsAny("skills", skills).join(",")})`);

  if (filters.gender?.trim()) {
    groups.push(`or(${genderVariants(filters.gender).map((value) => `gender.ilike.${encodeURIComponent(value)}`).join(",")})`);
  }
  if (filters.unionStatus?.trim()) params.push(`union_status=eq.${encodeURIComponent(filters.unionStatus.trim())}`);
  if (filters.representation === "Represented") params.push("representation=not.is.null");
  if (filters.representation === "Independent") params.push("representation=is.null");

  const heightRange = BROWSE_HEIGHT_RANGES[filters.height ?? ""];
  if (heightRange) params.push(...heightRange.map((clause) => `height_inches=${clause}`));

  const inList = (column: string, values?: string[]) => {
    if (!values?.length) return;
    groups.push(`or(${values.map((value) => `${column}.ilike.${encodeIlike(value)}`).join(",")})`);
  };
  inList("hair_color", filters.hairColors);
  inList("eye_color", filters.eyeColors);
  // Stored ethnicity wording drifts ("African descent" vs "African American"); match on the lead term.
  inList("ethnicity", filters.ethnicities?.map((value) => value.split("/")[0].trim()));

  if (groups.length) params.push(`and=(${groups.join(",")})`);
  return `talent?${params.join("&")}`;
}

async function overlayVerification(rows: SearchProfileRecord[]): Promise<SearchProfileRecord[]> {
  if (!rows.length) return rows;
  const ids = rows.map((row) => `"${row.id}"`).join(",");
  const verified = await supabaseRestGet<ProfessionalProfileRow[]>(
    `talent_professional_profiles?select=${PROFESSIONAL_PROFILE_SELECT}&is_verified=eq.true&user_id=in.(${ids})`,
    { revalidate: 120 },
  );
  if (!verified?.length) return rows;

  const admin = createAdminSupabaseClient();
  const enriched = admin ? await enrichProfessionalProfileRows(admin, verified) : [];
  const verifiedById = new Map(verified.map((row) => [row.user_id, row]));
  const enrichedById = new Map(enriched.map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const pro = verifiedById.get(row.id);
    if (!pro) return row;
    const headshot = row.headshot_url || enrichedById.get(row.id)?.headshot_url || null;
    return { ...row, is_verified: true, professional_profile_id: pro.id, headshot_url: headshot };
  });
}

/** Browse grid: SQL-side filtering, ordering, and offset pagination with an exact total. */
export const searchBrowseTalent = cache(async (filters: SearchFilters): Promise<SearchResult> => {
  const page = Number.isFinite(filters.page) && (filters.page ?? 0) > 0 ? Math.floor(filters.page!) : 1;

  if (!getSupabaseConfig()) {
    const filtered = filterSearchProfiles(mockTalentProfiles.map(normalizeSearchProfile), filters);
    const start = (page - 1) * BROWSE_PAGE_SIZE;
    return {
      items: filtered.slice(start, start + BROWSE_PAGE_SIZE),
      total: filtered.length,
      page,
      pageSize: BROWSE_PAGE_SIZE,
      usingFallbackData: true,
      source: "mock",
    };
  }

  const result = await supabaseRestGetCounted<SearchProfileRecord>(buildBrowseQueryPath(filters, page), {
    revalidate: 60,
  });
  if (!result) return { ...emptySearchResult(filters), page, pageSize: BROWSE_PAGE_SIZE };

  const items = await overlayVerification(result.rows.map(normalizeSearchProfile));
  return { items, total: result.total, page, pageSize: BROWSE_PAGE_SIZE, usingFallbackData: false, source: "talent" };
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

/** Curated rosters resolve explicit user IDs, independently of navigator pagination. */
export async function searchCuratedTalent(userIds: string[]): Promise<SearchResult> {
  const empty: SearchResult = { items: [], total: 0, page: 1, pageSize: 0, source: "talent", usingFallbackData: false };
  const ids = [...new Set(userIds)].slice(0, 200);
  if (!ids.length) return empty;
  const admin = createAdminSupabaseClient();
  if (admin) {
    const { data, error } = await admin.from("talent_professional_profiles").select(PROFESSIONAL_PROFILE_SELECT)
      .in("user_id", ids).eq("is_verified", true).in("subtype", [...TALENT_SUBTYPES]);
    if (!error && data?.length) {
      const profiles = await enrichProfessionalProfileRows(admin, data);
      profiles.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      return { ...empty, items: profiles, total: profiles.length, pageSize: profiles.length };
    }
  }
  const live = await readLiveSearchProfiles(ids);
  if (!live.length) return { ...empty, source: admin ? "unavailable" : "talent" };
  return { ...empty, items: live, total: live.length, pageSize: live.length };
}
