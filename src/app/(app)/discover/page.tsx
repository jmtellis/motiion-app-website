import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { DiscoverView } from "@/components/app/DiscoverView";
import { fetchHomeCollections } from "@/lib/app/home-discovery";
import { requireTalentAccount } from "@/lib/auth/session";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { searchTalentByCredit } from "@/lib/talent-navigator/search-navigator-rpc";
import type { TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { searchBrowseTalent, searchCuratedTalent, searchTalentProfiles } from "@/lib/search/search-profiles";
import { fetchRecentlyViewedTalent } from "@/lib/talent/referrer-lists";
import { redirect } from "next/navigation";
import type { SearchFilters, SearchResult } from "@/types/search";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTalentAccount();
  const params = await searchParams;
  const credit = typeof params.credit === "string" ? params.credit.trim() : "";

  const list = (...keys: string[]) =>
    keys
      .map((key) => params[key])
      .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value, index, all) => value && all.indexOf(value) === index);
  const single = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const styles = list("styles", "style");

  const filters: SearchFilters = {
    keyword: credit ? "" : typeof params.keyword === "string" ? params.keyword : "",
    location: typeof params.location === "string" ? params.location : "",
    subtype:
      typeof params.subtype === "string"
        ? (params.subtype as SearchFilters["subtype"])
        : "",
    styles,
    style: styles[0] ?? "",
    skills: list("skills"),
    hairColors: list("hair"),
    eyeColors: list("eyes"),
    ethnicities: list("ethnicity"),
    gender: single("gender"),
    unionStatus: single("union"),
    representation: single("rep"),
    height: single("height"),
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
      redirect(next.size ? `/discover?${next}` : "/discover");
    }
    result = browse;
    initialData = buildNavigatorInitialData(navigator);
  }

  const recent = await recentPromise;

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
