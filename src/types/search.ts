export type TalentSubtype = "dancer" | "choreographer";

export type ProfileHighlight = {
  title: string;
  subtitle?: string | null;
};

export type SearchProfileRecord = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  headshot_url?: string | null;
  headshot_urls?: string[] | null;
  location?: string | null;
  talent_types?: string[] | null;
  styles?: string[] | null;
  skills?: string[] | null;
  profile_highlights?: ProfileHighlight[] | null;
  bio?: string | null;
  representation?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  height?: string | null;
  union_status?: string | null;
  eye_color?: string | null;
  hair_color?: string | null;
  date_of_birth?: string | null;
  agency_logo_url?: string | null;
  is_verified?: boolean;
};

export type SearchFilters = {
  keyword?: string;
  location?: string;
  subtype?: TalentSubtype | "" | string;
  style?: string;
  gender?: string;
  ethnicity?: string;
  height?: string;
  representation?: string;
  agency?: string;
  unionStatus?: string;
  page?: number;
  /** When true, fetch a larger result set for the talent navigator grid. */
  navigator?: boolean;
};

export type SearchResult = {
  items: SearchProfileRecord[];
  total: number;
  page: number;
  pageSize: number;
  usingFallbackData: boolean;
  source: "public_search_profiles" | "talent" | "mock" | "unavailable";
};
