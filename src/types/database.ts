import type {
  TalentBuyerMarketPlace,
  TalentBuyerNotificationPreferences,
  TalentBuyerPrimaryGoal,
  TalentBuyerRole,
  TalentBuyerStyleFocus,
  TalentBuyerTalentType,
  TalentBuyerVerificationLinks,
} from "@/types/talent-buyers";

export type AccountType = "talent" | "lookingForTalent" | "looking_for_talent";

export type TalentSubtype = "dancer" | "choreographer";

export type NonTalentSubtype =
  | "casting_director"
  | "creative_director"
  | "producer"
  | "manager"
  | "agency"
  | "recruiter"
  | "other";

export type ProfileRecord = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  account_type: AccountType | null;
  username: string | null;
  talent_types: string[] | null;
  headshot_urls: string[] | null;
  onboarding_completed_at: string | null;
};

export type NonTalentProfileRecord = {
  id: string;
  company_name: string | null;
  non_talent_type: NonTalentSubtype | null;
  work_email: string | null;
  user_type?: string | null;
  primary_goal?: TalentBuyerPrimaryGoal | null;
  role?: TalentBuyerRole | null;
  organization_name?: string | null;
  organization_website?: string | null;
  company_size?: string | null;
  talent_types?: TalentBuyerTalentType[] | null;
  style_focus?: TalentBuyerStyleFocus[] | null;
  markets?: string[] | null;
  market_places?: TalentBuyerMarketPlace[] | null;
  verification_links?: TalentBuyerVerificationLinks | null;
  notification_preferences?: TalentBuyerNotificationPreferences | null;
  onboarding_completed?: boolean | null;
};

export type DashboardProfile = {
  id: string;
  email: string | null;
  fullName: string;
  accountType: AccountType | null;
  onboardingCompletedAt?: string | null;
  talentTypes?: string[] | null;
  companyName?: string | null;
  nonTalentType?: NonTalentSubtype | null;
  username?: string | null;
  avatarUrl?: string | null;
  userType?: string | null;
  primaryGoal?: TalentBuyerPrimaryGoal | null;
  buyerRole?: TalentBuyerRole | null;
  organizationName?: string | null;
  organizationWebsite?: string | null;
  companySize?: string | null;
  buyerTalentTypes?: TalentBuyerTalentType[] | null;
  styleFocus?: TalentBuyerStyleFocus[] | null;
  markets?: string[] | null;
  marketPlaces?: TalentBuyerMarketPlace[] | null;
  verificationLinks?: TalentBuyerVerificationLinks | null;
  notificationPreferences?: TalentBuyerNotificationPreferences | null;
  buyerOnboardingCompleted?: boolean | null;
};
