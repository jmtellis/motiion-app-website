/** Legacy single primary goal — still written for backward compatibility. */
export type TalentBuyerPrimaryGoal =
  | "find_talent"
  | "post_opportunities"
  | "manage_talent"
  | "everything";

/** Onboarding + stored roles (includes legacy values for existing profiles). */
export type TalentBuyerRole =
  | "choreographer"
  | "casting_professional"
  | "creative_director_or_producer"
  | "talent_representative"
  | "brand_or_agency_professional"
  | "other"
  // Legacy values retained for existing rows / settings migration
  | "casting_director"
  | "creative_director"
  | "producer"
  | "talent_agency"
  | "studio_owner"
  | "dance_company"
  | "brand"
  | "production_company"
  | "event_organizer";

export type TalentBuyerPlatformGoal =
  | "find_dancers"
  | "run_a_casting"
  | "manage_talent"
  | "build_a_roster"
  | "staff_a_project"
  | "coordinate_bookings"
  | "just_exploring";

export type TalentBuyerWorkType =
  | "music_or_touring"
  | "film_or_television"
  | "commercial_or_branded"
  | "live_events"
  | "classes_or_training"
  | "representation"
  | "other";

export type TalentBuyerOrganizationRelationship =
  | "organization"
  | "independent"
  | "multiple";

export type TalentBuyerCompanySize =
  | "just_me"
  | "2_10"
  | "11_50"
  | "51_200"
  | "200_plus";

export type TalentBuyerTalentType =
  | "dancers"
  | "choreographers"
  | "dance_teams"
  | "teachers"
  | "creative_talent";

export type TalentBuyerStyleFocus =
  | "commercial"
  | "hip_hop"
  | "contemporary"
  | "jazz"
  | "ballet"
  | "ballroom"
  | "latin"
  | "tap"
  | "heels"
  | "musical_theatre"
  | "open_style";

export type TalentBuyerOnboardingStep =
  | "professionalContext"
  | "goalsAndWork"
  | "organizationAndMarket"
  | "success";

export type TalentBuyerVerificationLinks = {
  companyWebsite?: string;
  linkedin?: string;
  instagram?: string;
};

export type TalentBuyerNotificationPreferences = {
  newTalentMatches: boolean;
  opportunityUpdates: boolean;
  industryAnnouncements: boolean;
};

export type TalentBuyerMarketPlace = {
  placeId: string;
  city: string | null;
  region: string | null;
  country: string | null;
  displayLabel: string;
};

export type TalentBuyerOnboardingDraft = {
  version: 3;
  userId: string;
  currentStep: TalentBuyerOnboardingStep;
  fullName: string;
  contactEmail: string;
  role: TalentBuyerRole | "";
  customRole: string;
  platformGoals: TalentBuyerPlatformGoal[];
  workTypes: TalentBuyerWorkType[];
  customWorkType: string;
  organizationRelationship: TalentBuyerOrganizationRelationship | "";
  organizationName: string;
  organizationWebsite: string;
  organizationBrandDomain: string;
  /** Canonical display labels derived from `marketPlaces` for search/compat. */
  markets: string[];
  marketPlaces: TalentBuyerMarketPlace[];
  notificationPreferences: TalentBuyerNotificationPreferences;
};

export type CompleteTalentBuyerOnboardingPayload = TalentBuyerOnboardingDraft;

export type CompleteTalentBuyerOnboardingResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export type SaveTalentBuyerOnboardingProgressResult =
  | { ok: true }
  | { ok: false; error: string };

export type IndustryIdentityStatus =
  | "requires_input"
  | "processing"
  | "verified"
  | "canceled"
  | "expired"
  | "redacted";

export type IndustryPrimaryAction = {
  id:
    | "create_casting"
    | "create_project"
    | "find_dancers"
    | "start_roster"
    | "coordinate_bookings"
    | "explore";
  label: string;
  href: string;
};
