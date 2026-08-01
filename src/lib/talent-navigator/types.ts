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
  hairColor?: string;
  eyeColor?: string;
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
  /** Evidence-backed reasons this dancer matched the active search intent. */
  matchReasons?: Array<{
    category: string;
    label: string;
    evidenceType: string;
    evidenceId?: string;
    verificationStatus?: string;
    sourceType?: string;
    caveat?: string;
  }>;
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
  /** Multi-select locations; `location` stays as the first selected for legacy paths. */
  locations: string[];
  representation: string;
  agency: string;
  /** Multi-select agencies; `agency` stays as the first selected for legacy paths. */
  agencies: string[];
  /** Primary style/genre for legacy search paths (first of `genres`). */
  style: string;
  /** Multi-select genres aligned with casting role browse filters. */
  genres: string[];
  /** Multi-select skills aligned with casting role browse filters. */
  skills: string[];
  gender: string;
  ethnicity: string;
  /** Multi-select ethnicities aligned with casting role attribute selection. */
  ethnicities: string[];
  hairColors: string[];
  eyeColors: string[];
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
  locations: [],
  representation: "",
  agency: "",
  agencies: [],
  style: "",
  genres: [],
  skills: [],
  gender: "",
  ethnicity: "",
  ethnicities: [],
  hairColors: [],
  eyeColors: [],
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
  /** Per-visit salt so unfiltered Discover rows reshuffle without hydration mismatch. */
  shuffleSalt?: string;
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
