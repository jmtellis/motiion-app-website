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

  try {
    const rawDraft = window.localStorage.getItem(getDraftKey(userId));
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft) as OnboardingDraft & { role?: string | null };
    if (!draft || draft.userId !== userId || typeof draft.currentStep !== "string" ||
        [draft.firstName, draft.lastName, draft.email, draft.username, draft.dateOfBirth, draft.displayName].some(value => typeof value !== "string")) return null;
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
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try { window.localStorage.setItem(getDraftKey(draft.userId), JSON.stringify(draft)); return true; } catch { return false; }
}

export function clearOnboardingDraft(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try { window.localStorage.removeItem(getDraftKey(userId)); } catch { /* storage is optional */ }
}
