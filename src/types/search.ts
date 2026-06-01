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
};

export type SearchFilters = {
  keyword?: string;
  location?: string;
  subtype?: TalentSubtype | "";
  style?: string;
  page?: number;
};

export type SearchResult = {
  items: SearchProfileRecord[];
  total: number;
  page: number;
  pageSize: number;
  usingFallbackData: boolean;
  source: "public_search_profiles" | "talent" | "mock" | "unavailable";
};
