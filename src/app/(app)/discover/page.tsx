import { DiscoverView } from "@/components/app/DiscoverView";
import { searchTalentProfiles } from "@/lib/search/search-profiles";
import type { SearchFilters } from "@/types/search";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: SearchFilters = {
    keyword: typeof params.keyword === "string" ? params.keyword : "",
    location: typeof params.location === "string" ? params.location : "",
    subtype:
      typeof params.subtype === "string" ? (params.subtype as SearchFilters["subtype"]) : "",
    style: typeof params.style === "string" ? params.style : "",
    page:
      typeof params.page === "string" && !Number.isNaN(Number(params.page))
        ? Number(params.page)
        : 1,
  };

  const result = await searchTalentProfiles(filters);

  return <DiscoverView filters={filters} result={result} />;
}
