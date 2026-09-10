/**
 * Canonical Motiion copy shared with iOS OnboardingValueCopy / OnboardingSkipLaterCopy /
 * HomeProfileCompletionFocus / TalentProfileSetupNudgeView / OnboardingCompleteView.
 */

export const talentSetupValueItems = [
  "Get found in casting searches",
  "Submit to castings in seconds",
  "Share a pro-ready profile",
] as const;

export const submitForReviewValueItems = [
  "Get Motiion approved for casting",
  "Appear where industry is looking",
  "Show you're a trusted Motiion talent",
] as const;

export const accountCreatedCopy = {
  body: "Complete your profile and submit it for Motiion review.",
  primary: "Complete your profile",
  secondary: "Not now",
  chromeTitle: "Account created",
} as const;

export const profileSetupNudgeCopy = {
  title: "Build your portfolio",
  subtitle: "Headshots, sizing, and credits help casting teams find you faster.",
  primary: "Finish my profile",
  secondary: "Not now",
} as const;

export const homeCompletionCopy = {
  headline: "Complete your profile",
  underReview: "Your profile is under review",
  approved: "Your profile is Motiion approved",
} as const;

export const skipLaterCopy = {
  resumeImport: "Add resume later",
  sizing: "Add sizing later",
  representation: "Add representation later",
  unionStatus: "Add union status later",
  addStyles: "Add genres later",
  addSkills: "Add skills later",
  addCredits: "Add credits later",
  submitForReview: "Submit later",
  default: "Add later",
} as const;

export type AcquisitionSource =
  | "instagram"
  | "friend_or_referral"
  | "motiion_founder"
  | "event"
  | "other";

export const acquisitionSourceOptions: Array<{ value: AcquisitionSource; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "friend_or_referral", label: "Friend or referral" },
  { value: "motiion_founder", label: "Motiion founder" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];
