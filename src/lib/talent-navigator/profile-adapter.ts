import { portraitWallImages } from "@/lib/mock-data";
import { isRepresented } from "@/lib/search/talent-filter-logic";
import type { SearchProfileRecord, SearchResult } from "@/types/search";

import { filterTalentPool } from "./rows";
import { mockNavigatorTalent } from "./mock-data";
import type { NavigatorDataSource, Talent, TalentNavigatorFilters, TalentNavigatorInitialData } from "./types";

function slugFromProfile(profile: SearchProfileRecord): string {
  return profile.username?.trim() || profile.id;
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function searchProfileToTalent(profile: SearchProfileRecord, index: number): Talent {
  const name = profile.display_name || profile.full_name || "Talent";
  const styles = parseStringArray(profile.styles);
  const skills = parseStringArray(profile.skills);
  const talentTypes = parseStringArray(profile.talent_types);
  const combinedStyles = [...new Set([...styles, ...skills])];
  const image =
    profile.headshot_url?.trim() ||
    profile.headshot_urls?.[0]?.trim() ||
    portraitWallImages[index % portraitWallImages.length];

  return {
    id: profile.id,
    slug: slugFromProfile(profile),
    name,
    imageUrl: image,
    location: profile.location ?? undefined,
    agency: profile.representation ?? undefined,
    styles: combinedStyles.length ? combinedStyles : talentTypes,
    represented: isRepresented(profile.representation),
    gender: profile.gender ?? undefined,
    ethnicity: profile.ethnicity ?? undefined,
    height: profile.height ?? undefined,
    unionStatus: profile.union_status ?? undefined,
    isVerified: profile.is_verified ?? false,
    credits: profile.profile_highlights?.map((highlight) => highlight.title),
  };
}

function mapSource(result: SearchResult): NavigatorDataSource {
  if (result.source === "unavailable") return "unavailable";
  if (result.source === "mock" || result.usingFallbackData) return "mock";
  return "live";
}

export function buildNavigatorInitialData(
  result: SearchResult,
  filters?: TalentNavigatorFilters,
): TalentNavigatorInitialData {
  const source = mapSource(result);

  if (result.usingFallbackData || source === "mock") {
    const talent = filters ? filterTalentPool(mockNavigatorTalent, filters) : mockNavigatorTalent;
    return {
      talent,
      usingFallbackData: true,
      source: "mock",
    };
  }

  if (result.items.length === 0) {
    return {
      talent: [],
      usingFallbackData: false,
      source,
    };
  }

  const talent = result.items.map((profile, index) => searchProfileToTalent(profile, index));

  return {
    talent,
    usingFallbackData: false,
    source,
  };
}

export function getTalentProfileHref(talent: Talent): string {
  return `/talent/${talent.slug}`;
}
