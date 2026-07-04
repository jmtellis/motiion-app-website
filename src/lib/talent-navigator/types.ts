export type Talent = {
  id: string;
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
};

export type TalentRow = {
  id: string;
  label: string;
  description?: string;
  talent: Talent[];
};

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
