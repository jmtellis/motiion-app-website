import {
  normalizeOnboardingRole,
  normalizeOnboardingStep,
  normalizeTalentTypes,
} from "@/lib/onboarding/flow";
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
    const draft = JSON.parse(rawDraft) as OnboardingDraft & { role?: string | null };
    const legacyRole = draft.role;
    const role = normalizeOnboardingRole(legacyRole);
    const talentTypes = normalizeTalentTypes(draft.talentTypes, legacyRole);
    let currentStep = normalizeOnboardingStep(draft.currentStep);
    // Older drafts stored role selection on the account screen.
    if (currentStep === "account" && !role) {
      currentStep = "role";
    }
    return {
      ...draft,
      role,
      talentTypes,
      acquisitionSource: draft.acquisitionSource ?? "",
      acquisitionSourceDetail: draft.acquisitionSourceDetail ?? "",
      accountType:
        role === "industry"
          ? "lookingForTalent"
          : role === "community"
            ? "community"
            : role === "talent"
              ? "talent"
              : draft.accountType,
      currentStep,
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
