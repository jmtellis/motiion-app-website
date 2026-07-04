export type TalentBuyerPrimaryGoal =
  | "find_talent"
  | "post_opportunities"
  | "manage_talent"
  | "everything";

export type TalentBuyerRole =
  | "casting_director"
  | "choreographer"
  | "creative_director"
  | "producer"
  | "talent_agency"
  | "studio_owner"
  | "dance_company"
  | "brand"
  | "production_company"
  | "event_organizer"
  | "other";

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
  | "dateOfBirth"
  | "primaryGoal"
  | "role"
  | "organization"
  | "talentNeeds"
  | "styleFocus"
  | "markets"
  | "verification"
  | "notifications"
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

export type TalentBuyerOnboardingDraft = {
  version: 1;
  userId: string;
  currentStep: TalentBuyerOnboardingStep;
  dateOfBirth: string;
  primaryGoal: TalentBuyerPrimaryGoal | "";
  role: TalentBuyerRole | "";
  organizationName: string;
  organizationWebsite: string;
  companySize: TalentBuyerCompanySize | "";
  talentTypes: TalentBuyerTalentType[];
  styleFocus: TalentBuyerStyleFocus[];
  markets: string[];
  verificationLinks: TalentBuyerVerificationLinks;
  notificationPreferences: TalentBuyerNotificationPreferences;
};

export type CompleteTalentBuyerOnboardingPayload = TalentBuyerOnboardingDraft;

export type CompleteTalentBuyerOnboardingResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };
