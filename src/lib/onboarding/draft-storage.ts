import { normalizeOnboardingStep } from "@/lib/onboarding/flow";
import type { OnboardingDraft } from "@/types/onboarding";

function getDraftKey(userId: string) {
  return `motiion:onboarding:${userId}`;
}

export function loadOnboardingDraft(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.localStorage.getItem(getDraftKey(userId));

  if (!rawDraft) {
    return null;
  }

  try {
    const draft = JSON.parse(rawDraft) as OnboardingDraft;
    return {
      ...draft,
      currentStep: normalizeOnboardingStep(draft.currentStep),
    };
  } catch {
    window.localStorage.removeItem(getDraftKey(userId));
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getDraftKey(draft.userId), JSON.stringify(draft));
}

export function clearOnboardingDraft(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getDraftKey(userId));
}
