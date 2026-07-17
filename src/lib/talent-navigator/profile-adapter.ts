import { getProfileInitials } from "@/lib/auth/avatar";
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

function headshotPlaceholderDataUrl(name: string): string {
  const initials = getProfileInitials(name || "?");
  const hue =
    Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533" viewBox="0 0 400 533"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},35%,28%)"/><stop offset="100%" style="stop-color:hsl(${hue},45%,18%)"/></linearGradient></defs><rect width="400" height="533" fill="url(#g)"/><text x="200" y="280" text-anchor="middle" font-family="system-ui,sans-serif" font-size="96" font-weight="600" fill="rgba(255,255,255,0.35)">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function searchProfileToTalent(
  profile: SearchProfileRecord,
  index: number,
  options?: { useMockImages?: boolean },
): Talent {
  const name = profile.display_name || profile.full_name || "Talent";
  const styles = parseStringArray(profile.styles);
  const skills = parseStringArray(profile.skills);
  const talentTypes = parseStringArray(profile.talent_types);
  const combinedStyles = [...new Set([...styles, ...skills])];
  const image =
    profile.headshot_url?.trim() ||
    profile.headshot_urls?.[0]?.trim() ||
    (options?.useMockImages
      ? portraitWallImages[index % portraitWallImages.length]
      : headshotPlaceholderDataUrl(name));

  return {
    id: profile.id,
    professionalProfileId: profile.professional_profile_id ?? undefined,
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
  const useMockImages = result.usingFallbackData || result.source === "mock";

  if (useMockImages) {
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

  const talent = result.items.map((profile, index) =>
    searchProfileToTalent(profile, index, { useMockImages }),
  );

  return {
    talent,
    usingFallbackData: false,
    source,
  };
}

export function getTalentProfileHref(talent: Talent): string {
  return `/talent/${talent.slug}`;
}
