import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { DiscoverView } from "@/components/app/DiscoverView";
import { fetchHomeCollections } from "@/lib/app/home-discovery";
import { requireTalentAccount } from "@/lib/auth/session";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { searchTalentByCredit } from "@/lib/talent-navigator/search-navigator-rpc";
import type { TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { searchCuratedTalent, searchTalentProfiles } from "@/lib/search/search-profiles";
import { fetchRecentlyViewedTalent } from "@/lib/talent/referrer-lists";
import type { SearchFilters, SearchResult } from "@/types/search";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTalentAccount();
  const params = await searchParams;
  const credit = typeof params.credit === "string" ? params.credit.trim() : "";

  const filters: SearchFilters = {
    keyword: credit ? "" : typeof params.keyword === "string" ? params.keyword : "",
    location: typeof params.location === "string" ? params.location : "",
    subtype:
      typeof params.subtype === "string"
        ? (params.subtype as SearchFilters["subtype"])
        : "",
    style: typeof params.style === "string" ? params.style : "",
    page:
      typeof params.page === "string" && !Number.isNaN(Number(params.page))
        ? Number(params.page)
        : 1,
    navigator: true,
  };

  const collection = typeof params.collection === "string"
    ? (await fetchHomeCollections()).find((item) => item.id === params.collection) : undefined;

  let result: SearchResult;
  let initialData: TalentNavigatorInitialData;
  if (credit && !collection) {
    const creditSearch = await searchTalentByCredit(credit);
    result = creditSearch.result;
    initialData = creditSearch.initial;
  } else {
    result = collection
      ? await searchCuratedTalent(collection.talent_ids)
      : await searchTalentProfiles(filters);
    initialData = buildNavigatorInitialData(result);
  }

  const recent = await fetchRecentlyViewedTalent();

  return (
    <TalentDiscovery
      collectionTitle={collection?.headline}
      initialData={initialData}
      keyword={filters.keyword ?? ""}
      credit={collection ? "" : credit}
      recentlyViewed={recent.talent}
    >
      <DiscoverView filters={filters} result={result} credit={collection ? "" : credit} />
    </TalentDiscovery>
  );
}
