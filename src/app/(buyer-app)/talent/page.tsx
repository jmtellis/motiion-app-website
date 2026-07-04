import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { TalentNavigatorPage } from "@/components/talent-buyers/talent-navigator/TalentNavigatorPage";
import { requireHiringAccount } from "@/lib/auth/session";
import { isIndustryLocked } from "@/lib/billing/gate";
import { listSavedSearches } from "@/lib/talent-buyers/saved-searches";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { fetchNavigatorFilterOptions } from "@/lib/talent-navigator/fetch-filter-options";
import { searchFiltersToNavigatorParams } from "@/lib/talent-navigator/search-filters";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import { searchTalentProfiles } from "@/lib/search/search-profiles";
import type { SearchFilters } from "@/types/search";

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] : "";
}

export default async function BuyerTalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireHiringAccount();

  if (await isIndustryLocked(profile.id)) {
    return (
      <div className="talent-navigator-route flex min-h-screen items-center justify-center">
        <PaywallCard feature="Advanced talent search" />
      </div>
    );
  }

  const params = await searchParams;

  const filters: SearchFilters = {
    keyword: readParam(params, "keyword"),
    location: readParam(params, "location"),
    subtype: readParam(params, "subtype") as SearchFilters["subtype"],
    style: readParam(params, "style"),
    gender: readParam(params, "gender"),
    ethnicity: readParam(params, "ethnicity"),
    height: readParam(params, "height"),
    representation: readParam(params, "representation"),
    agency: readParam(params, "agency"),
    unionStatus: readParam(params, "unionStatus"),
    navigator: true,
  };

  const initialFilters = {
    ...EMPTY_NAVIGATOR_FILTERS,
    ...searchFiltersToNavigatorParams(filters),
  };

  const [result, filterOptions, savedSearchResult] = await Promise.all([
    searchTalentProfiles(filters),
    fetchNavigatorFilterOptions(),
    listSavedSearches(),
  ]);
  const initialData = buildNavigatorInitialData(result, initialFilters);

  return (
    <div className="talent-navigator-route">
      <TalentNavigatorPage
        profile={profile}
        initialData={initialData}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        initialSavedSearches={savedSearchResult.searches}
      />
    </div>
  );
}
