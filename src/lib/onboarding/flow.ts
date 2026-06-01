import type {
  OnboardingDraft,
  OnboardingRole,
  OnboardingStep,
} from "@/types/onboarding";

const talentSteps: OnboardingStep[] = [
  "account",
  "profile",
  "attributes",
  "workDetails",
  "experience",
  "review",
];

const hiringSteps: OnboardingStep[] = ["account", "profile", "review"];

/** Legacy per-field steps saved in local drafts before section-based web flow. */
const legacyStepToSection: Record<string, OnboardingStep> = {
  name: "account",
  email: "account",
  dateOfBirth: "account",
  notifications: "account",
  role: "account",
  headshots: "profile",
  resume: "profile",
  username: "profile",
  hiringDetails: "profile",
  gender: "attributes",
  ethnicity: "attributes",
  height: "attributes",
  hairColor: "attributes",
  eyeColor: "attributes",
  sizing: "workDetails",
  workingLocations: "workDetails",
  representation: "workDetails",
  unionStatus: "workDetails",
  styles: "experience",
  skills: "experience",
  training: "experience",
  credits: "experience",
  review: "review",
};

export const onboardingSectionLabels: Record<OnboardingStep, string> = {
  account: "Account",
  profile: "Profile",
  attributes: "Attributes",
  workDetails: "Work details",
  experience: "Experience",
  review: "Review",
};

export function normalizeOnboardingStep(step: string): OnboardingStep {
  if (step in onboardingSectionLabels) {
    return step as OnboardingStep;
  }

  return legacyStepToSection[step] ?? "account";
}

export function getOnboardingSteps(role: OnboardingRole | null): OnboardingStep[] {
  if (role === "hiring") {
    return hiringSteps;
  }

  if (role === "choreographer") {
    return talentSteps;
  }

  return role === "dancer" ? talentSteps : ["account"];
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

export function isChoreographer(role: OnboardingRole | null) {
  return role === "choreographer";
}

export function isHiring(role: OnboardingRole | null) {
  return role === "hiring";
}

export function isTalent(role: OnboardingRole | null) {
  return role === "dancer" || role === "choreographer";
}
