export type Talent = {
  id: string;
  /** professional_profiles.id when known — preferred for Library memberships */
  professionalProfileId?: string;
  slug: string;
  name: string;
  isVerified?: boolean;
  pronouns?: string;
  location?: string;
  agency?: string;
  styles: string[];
  height?: string;
  availability?: string;
  unionStatus?: string;
  experience?: string;
  credits?: string[];
  imageUrl: string;
  represented?: boolean;
  gender?: string;
  ethnicity?: string;
  recentlyActive?: boolean;
  newToMotiion?: boolean;
  recommended?: boolean;
  /** Optional secondary line (e.g. "By …") */
  caption?: string;
  /** Credit-search evidence when results come from structured credit query */
  matchingCredits?: Array<{
    id: string;
    role: string | null;
    productionName: string | null;
    artistName: string | null;
    choreographerName: string | null;
    creditYear: number | null;
    verificationLabel: string;
    sourceLabel: string;
    verificationStatus?: string;
  }>;
  matchingCreditCount?: number;
};

export type TalentRow = {
  id: string;
  label: string;
  description?: string;
  talent: Talent[];
};

export type RelationshipMatchMode = "all" | "any";

export type TalentNavigatorFilters = {
  keyword: string;
  location: string;
  representation: string;
  agency: string;
  style: string;
  gender: string;
  ethnicity: string;
  height: string;
  availability: string;
  unionStatus: string;
  experience: string;
  subtype: string;
  openRoleId: string;
  /** Credit search: artist names (display) */
  artists: string[];
  choreographers: string[];
  productions: string[];
  /** Resolved entity UUIDs after disambiguation */
  resolvedArtistIds: string[];
  resolvedChoreographerIds: string[];
  resolvedProductionIds: string[];
  relationshipMatchMode: RelationshipMatchMode;
  verificationStatuses: string[];
};

export const EMPTY_NAVIGATOR_FILTERS: TalentNavigatorFilters = {
  keyword: "",
  location: "",
  representation: "",
  agency: "",
  style: "",
  gender: "",
  ethnicity: "",
  height: "",
  availability: "",
  unionStatus: "",
  experience: "",
  subtype: "",
  openRoleId: "",
  artists: [],
  choreographers: [],
  productions: [],
  resolvedArtistIds: [],
  resolvedChoreographerIds: [],
  resolvedProductionIds: [],
  relationshipMatchMode: "all",
  verificationStatuses: [],
};

export type NavigatorDataSource = "live" | "mock" | "unavailable";

export type TalentNavigatorInitialData = {
  talent: Talent[];
  usingFallbackData: boolean;
  source: NavigatorDataSource;
};

export type SavedSearch = {
  id: string;
  label: string;
  filters: Partial<TalentNavigatorFilters>;
};

export function hasCreditSearchFilters(filters: TalentNavigatorFilters): boolean {
  return (
    (filters.artists?.length ?? 0) > 0 ||
    (filters.choreographers?.length ?? 0) > 0 ||
    (filters.productions?.length ?? 0) > 0 ||
    (filters.resolvedArtistIds?.length ?? 0) > 0 ||
    (filters.resolvedChoreographerIds?.length ?? 0) > 0 ||
    (filters.resolvedProductionIds?.length ?? 0) > 0
  );
}
