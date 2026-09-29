import { fetchHomeCollections } from "@/lib/app/home-discovery";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { searchTalentByCredit } from "@/lib/talent-navigator/search-navigator-rpc";
import type { Talent, TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { searchBrowseTalent, searchCuratedTalent, searchTalentProfiles } from "@/lib/search/search-profiles";
import { fetchRecentlyViewedTalent } from "@/lib/talent/referrer-lists";
import type { SearchFilters, SearchResult } from "@/types/search";

export type DiscoverCanvas = {
  filters: SearchFilters;
  credit: string;
  collectionTitle?: string;
  result: SearchResult;
  initialData: TalentNavigatorInitialData;
  recentlyViewed: Talent[];
};

type SearchParams = Record<string, string | string[] | undefined>;

function listParams(params: SearchParams, ...keys: string[]) {
  return keys
    .map((key) => params[key])
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value, index, all) => value && all.indexOf(value) === index);
}

function single(params: SearchParams, key: string) {
  return typeof params[key] === "string" ? params[key] : "";
}

/** Shared Browse / Explore data for talent and industry Discover. */
export async function loadDiscoverCanvas(
  params: SearchParams,
  basePath: string,
): Promise<{ redirectTo: string } | DiscoverCanvas> {
  const credit = single(params, "credit").trim();
  const styles = listParams(params, "styles", "style");
  const filters: SearchFilters = {
    keyword: credit ? "" : single(params, "keyword"),
    location: single(params, "location"),
    subtype: single(params, "subtype") as SearchFilters["subtype"],
    styles,
    style: styles[0] ?? "",
    skills: listParams(params, "skills"),
    hairColors: listParams(params, "hair"),
    eyeColors: listParams(params, "eyes"),
    ethnicities: listParams(params, "ethnicity"),
    gender: single(params, "gender"),
    unionStatus: single(params, "union"),
    representation: single(params, "rep"),
    height: single(params, "height"),
    page:
      typeof params.page === "string" && !Number.isNaN(Number(params.page))
        ? Number(params.page)
        : 1,
    navigator: true,
  };

  const collectionId = single(params, "collection");
  const collection = collectionId
    ? (await fetchHomeCollections()).find((item) => item.id === collectionId)
    : undefined;

  let result: SearchResult;
  let initialData: TalentNavigatorInitialData;
  const recentPromise = fetchRecentlyViewedTalent();
  if (credit && !collection) {
    const creditSearch = await searchTalentByCredit(credit);
    result = creditSearch.result;
    initialData = creditSearch.initial;
  } else if (collection) {
    result = await searchCuratedTalent(collection.talent_ids);
    initialData = buildNavigatorInitialData(result);
  } else {
    const [navigator, browse] = await Promise.all([
      searchTalentProfiles(filters),
      searchBrowseTalent({ ...filters, navigator: false }),
    ]);
    const lastPage = Math.max(1, Math.ceil(browse.total / browse.pageSize));
    if (browse.page > lastPage) {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string" && key !== "page") next.set(key, value);
      }
      if (lastPage > 1) next.set("page", String(lastPage));
      return { redirectTo: next.size ? `${basePath}?${next}` : basePath };
    }
    result = browse;
    initialData = buildNavigatorInitialData(navigator);
  }

  const recent = await recentPromise;
  return {
    filters,
    credit: collection ? "" : credit,
    collectionTitle: collection?.headline,
    result,
    initialData,
    recentlyViewed: recent.talent,
  };
}
