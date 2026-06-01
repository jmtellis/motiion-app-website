import type { AccountType, NonTalentSubtype, TalentSubtype } from "@/types/database";

export type OnboardingRole = "dancer" | "choreographer" | "hiring";

/** Web onboarding navigates by section (one screen per iOS container). */
export type OnboardingStep =
  | "account"
  | "profile"
  | "attributes"
  | "workDetails"
  | "experience"
  | "review";

export type OnboardingExperience = {
  title: string;
  role?: string;
  credits?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  link_url?: string;
};

export type OnboardingTraining = {
  name: string;
  program?: string;
  start_year?: string;
  end_year?: string;
  notes?: string;
};

export type OnboardingProfileHighlight = {
  title: string;
  subtitle?: string;
};

export type OnboardingDraft = {
  version: 1;
  userId: string;
  currentStep: OnboardingStep;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  notificationsEnabled: boolean;
  role: OnboardingRole | null;
  accountType: AccountType | null;
  talentTypes: TalentSubtype[];
  displayName: string;
  username: string;
  headshotUrls: string[];
  headshotOriginalUrls: string[];
  resumeUrl: string;
  gender: string;
  ethnicity: string;
  height: string;
  hairColor: string;
  eyeColor: string;
  sizing: string;
  workingLocations: string[];
  representation: string;
  unionStatus: string;
  unionMemberId: string;
  agent: string;
  additionalRepresentations: string[];
  styles: string[];
  skills: string[];
  training: OnboardingTraining[];
  experiences: OnboardingExperience[];
  profileHighlights: OnboardingProfileHighlight[];
  instagramUrl: string;
  xUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
  youtubeUrl: string;
  companyName: string;
  nonTalentType: NonTalentSubtype | "";
  hiringBio: string;
};

export type CompleteOnboardingPayload = OnboardingDraft;

export type CompleteOnboardingResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export type UsernameAvailabilityResult =
  | { ok: true; available: boolean; message?: string }
  | { ok: false; available: false; message: string };
