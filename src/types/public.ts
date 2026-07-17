import type { ProfileCredits } from "@/lib/profile/profile-credits";

export type ProfileHighlight = {
  id: string;
  experience_id?: string | null;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
};

export type ProfileExperience = {
  id?: string | null;
  title: string;
  role?: string | null;
  roles?: string[] | null;
  credits?: string | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  credits_display_name?: string | null;
  image_url?: string | null;
  credits_brand_domain?: string | null;
  tv_film_project_poster_url?: string | null;
  alternate_title?: string | null;
  link_url?: string | null;
  director?: string | null;
  main_talent?: string | null;
  main_talent_image_url?: string | null;
  production_company?: string | null;
  production_company_image_url?: string | null;
  production_company_brand_domain?: string | null;
  song_artists?: string[] | null;
  theater_name?: string | null;
  choreographers?: string[] | null;
  associate_choreographers?: string[] | null;
  assistants?: string[] | null;
  live_stage_subtype?: string | null;
  entity_image_status?: string | null;
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
  user_id?: string | null;
  full_name: string | null;
  username: string | null;
  headshot_url: string | null;
  headshot_urls: string[] | null;
  location: string | null;
  representation: string | null;
  agency_logo_url: string | null;
  gender: string | null;
  ethnicity: string | null;
  date_of_birth: string | null;
  height: string | null;
  union_status: string | null;
  eye_color: string | null;
  hair_color: string | null;
  sizing: string | null;
  skills: string[];
  styles: string[];
  talent_types: string[];
  profile_highlights: ProfileHighlight[];
  credits: ProfileCredits;
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

export type PublicEventDay = {
  id: string;
  dayDate: string;
  label: string | null;
  startTime: string | null;
  endTime: string | null;
  maxAttendees: number | null;
  spotsRemaining: number | null;
};

export type PublicTicketOption = {
  id: string;
  label: string;
  amountCents: number;
  currency: string;
  accessMode: "all_days" | "select_days" | "fixed_days";
  minDays: number | null;
  maxDays: number | null;
  includedEventDayIds: string[];
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
  eventDays?: PublicEventDay[] | null;
  ticketOptions?: PublicTicketOption[] | null;
  organizerDisplayName: string | null;
  organizerHeadshotURL: string | null;
  isEligibleForBooking: boolean;
  classWhatYouWillLearn?: string[] | null;
  classSkillLevel?: string | null;
  classFocus?: string | null;
  classIntensity?: string | null;
  classPrerequisites?: string | null;
  classDressCode?: string | null;
  classEquipment?: string | null;
  classCancellationPolicy?: string | null;
  sessionLevel?: string | null;
  sessionVibe?: string | null;
  sessionRules?: string | null;
  sessionGoodToKnow?: string | null;
  sessionDressCode?: string | null;
  sessionEquipment?: string | null;
  sessionPrepMaterial?: string | null;
  sessionCancellationPolicy?: string | null;
  sessionTags?: string[] | null;
};

export type PublicCastingCompensationLine = {
  label: string;
  value: string;
};

export type PublicCastingScheduleGroup = {
  category: string;
  days: string[];
};

export type PublicCastingRole = {
  id: string;
  title: string;
  description: string | null;
  coverImageURL: string | null;
  isActive: boolean;
  isCastingFinalized: boolean;
  ageRangeMin: number;
  ageRangeMax: number;
  ageRangeText: string;
  gender: string | null;
  ethnicityPreferences: string[];
  specialSkills: string[];
  heightRangeText: string | null;
  unionStatus: string | null;
  peopleNeeded: number;
  eligibleForSubmission: boolean;
};

export type PublicCasting = {
  id: string;
  title: string;
  production: string | null;
  description: string | null;
  coverImageURL: string | null;
  location: string | null;
  deadline: string | null;
  compensationSummary: string | null;
  compensationBreakdown?: PublicCastingCompensationLine[];
  requirementsSummary: string | null;
  usageNotes: string | null;
  additionalNotes?: string | null;
  schedule?: PublicCastingScheduleGroup[];
  externalSubmissionURL: string | null;
  organizerName: string | null;
  organizerHeadshotURL?: string | null;
  selectedRoleId: string | null;
  roles: PublicCastingRole[];
};
