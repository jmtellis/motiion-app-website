export type ProfileHighlight = {
  id: string;
  experience_id?: string | null;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
};

export type ProfileExperience = {
  title: string;
  role?: string | null;
  roles?: string[] | null;
  credits?: string | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  credits_display_name?: string | null;
  image_url?: string | null;
  tv_film_project_poster_url?: string | null;
};

export type ProfileVisual = {
  id: string;
  kind: "reel" | "skill" | "style" | "slate" | "other";
  ref?: string | null;
  url: string;
  sort?: number;
  duration_seconds?: number | null;
};

export type PublicTalentProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  headshot_url: string | null;
  headshot_urls: string[] | null;
  location: string | null;
  representation: string | null;
  agency_logo_url: string | null;
  gender: string | null;
  height: string | null;
  union_status: string | null;
  skills: string[];
  styles: string[];
  talent_types: string[];
  profile_highlights: ProfileHighlight[];
  experiences: ProfileExperience[];
  training: { title?: string; organization?: string; year?: string }[];
  profile_visuals: ProfileVisual[];
  resume_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
};

export type PublicActivityKind = "class" | "session" | "event";

export type PublicPricingTier = {
  id: string;
  label: string;
  amountCents: number;
};

export type PublicActivity = {
  id: string;
  title: string;
  kind: PublicActivityKind;
  description: string | null;
  coverImageURL: string | null;
  location: string | null;
  activityDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  maxAttendees: number | null;
  spotsRemaining: number | null;
  requirePayment: boolean;
  priceAmountCents: number | null;
  priceCurrency: string | null;
  pricingTiers: PublicPricingTier[] | null;
  organizerDisplayName: string | null;
  organizerHeadshotURL: string | null;
  isEligibleForBooking: boolean;
};
