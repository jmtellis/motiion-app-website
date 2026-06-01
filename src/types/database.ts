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
};
