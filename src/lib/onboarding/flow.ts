import type { TalentSubtype } from "@/types/database";
import type {
  OnboardingDraft,
  OnboardingRole,
  OnboardingStep,
} from "@/types/onboarding";

/** Lane 1 — Create Account (iOS TalentOnboardingJourney.initialSteps). */
const talentSteps: OnboardingStep[] = [
  "role",
  "account",
  "profile",
  "howDidYouHear",
  "accountCreated",
];

const communitySteps: OnboardingStep[] = [
  "role",
  "account",
  "profile",
  "howDidYouHear",
  "accountCreated",
];

/** Legacy per-field / long-form steps saved in local drafts before deferred setup. */
const legacyStepToSection: Record<string, OnboardingStep> = {
  name: "account",
  email: "account",
  dateOfBirth: "account",
  notifications: "account",
  role: "role",
  headshots: "profile",
  resume: "profile",
  username: "profile",
  hiringDetails: "profile",
  gender: "howDidYouHear",
  ethnicity: "howDidYouHear",
  height: "howDidYouHear",
  hairColor: "howDidYouHear",
  eyeColor: "howDidYouHear",
  sizing: "howDidYouHear",
  workingLocations: "howDidYouHear",
  representation: "howDidYouHear",
  unionStatus: "howDidYouHear",
  styles: "howDidYouHear",
  skills: "howDidYouHear",
  training: "howDidYouHear",
  credits: "howDidYouHear",
  attributes: "howDidYouHear",
  workDetails: "howDidYouHear",
  experience: "howDidYouHear",
  review: "howDidYouHear",
  howDidYouHear: "howDidYouHear",
  accountCreated: "accountCreated",
};

const legacyRoleMap: Record<string, OnboardingRole> = {
  dancer: "talent",
  choreographer: "talent",
  hiring: "industry",
  talent: "talent",
  industry: "industry",
  community: "community",
};

export const onboardingSectionLabels: Record<OnboardingStep, string> = {
  role: "Role",
  account: "Account",
  profile: "Profile",
  howDidYouHear: "About Motiion",
  accountCreated: "Done",
  attributes: "Attributes",
  workDetails: "Work details",
  experience: "Experience",
  review: "Review",
};

export const talentSubtypeOptions: Array<{ value: TalentSubtype; label: string }> = [
  { value: "dancer", label: "Dancer" },
  { value: "choreographer", label: "Choreographer" },
  { value: "instructor", label: "Instructor" },
];

export function normalizeOnboardingRole(role: string | null | undefined): OnboardingRole | null {
  if (!role) return null;
  return legacyRoleMap[role] ?? null;
}

export function normalizeTalentTypes(
  types: unknown,
  legacyRole?: string | null,
): TalentSubtype[] {
  const allowlist: TalentSubtype[] = ["dancer", "choreographer", "instructor"];
  const fromArray = Array.isArray(types)
    ? types
        .map((item) => String(item).trim().toLowerCase())
        .filter((item): item is TalentSubtype =>
          allowlist.includes(item as TalentSubtype),
        )
    : [];

  if (fromArray.length) {
    return [...new Set(fromArray)];
  }

  if (legacyRole === "dancer" || legacyRole === "choreographer") {
    return [legacyRole];
  }

  return [];
}

export function normalizeOnboardingStep(step: string): OnboardingStep {
  if (step in onboardingSectionLabels) {
    return step as OnboardingStep;
  }

  return legacyStepToSection[step] ?? "role";
}

export function getOnboardingSteps(role: OnboardingRole | null): OnboardingStep[] {
  if (role === "community") {
    return communitySteps;
  }

  if (role === "talent") {
    return talentSteps;
  }

  // Industry redirects out of this flow; keep role step only until redirect.
  return ["role"];
}

export function getIndustryOnboardingPath() {
  return "/talent-buyers/onboarding";
}

export function getStepIndex(step: OnboardingStep, role: OnboardingRole | null) {
  return Math.max(0, getOnboardingSteps(role).indexOf(step));
}

export function getNextStep(step: OnboardingStep, role: OnboardingRole | null): OnboardingStep {
  const steps = getOnboardingSteps(role);
  const index = getStepIndex(step, role);
  return steps[Math.min(index + 1, steps.length - 1)];
}

export function getPreviousStep(step: OnboardingStep, role: OnboardingRole | null): OnboardingStep {
  const steps = getOnboardingSteps(role);
  const index = getStepIndex(step, role);
  return steps[Math.max(index - 1, 0)];
}

export function getFlowProgress(step: OnboardingStep, role: OnboardingRole | null) {
  const steps = getOnboardingSteps(role);
  const index = getStepIndex(step, role);

  return {
    sectionTitle: onboardingSectionLabels[step],
    currentStep: index + 1,
    totalSteps: steps.length,
    percent: steps.length ? Math.round(((index + 1) / steps.length) * 100) : 0,
  };
}

export function getCompletionPercent(draft: OnboardingDraft) {
  return getFlowProgress(draft.currentStep, draft.role).percent;
}

export function isChoreographer(talentTypes: TalentSubtype[] | null | undefined) {
  return (talentTypes ?? []).includes("choreographer");
}

/** Physical/sizing/skills/training apply when any dancer or instructor type is selected. */
export function needsPhysicalTalentFields(talentTypes: TalentSubtype[] | null | undefined) {
  const types = talentTypes ?? [];
  return types.some((type) => type === "dancer" || type === "instructor");
}

export function isHiring(role: OnboardingRole | null) {
  return role === "industry";
}

export function isTalent(role: OnboardingRole | null) {
  return role === "talent";
}

export function isCommunity(role: OnboardingRole | null) {
  return role === "community";
}
