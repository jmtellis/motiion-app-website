import type { TalentBuyerOnboardingDraft } from "@/types/talent-buyers";

function getDraftKey(userId: string) {
  return `motiion:talent-buyer-onboarding:${userId}`;
}

export function loadTalentBuyerDraft(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.localStorage.getItem(getDraftKey(userId));

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as TalentBuyerOnboardingDraft;
  } catch {
    window.localStorage.removeItem(getDraftKey(userId));
    return null;
  }
}

export function saveTalentBuyerDraft(draft: TalentBuyerOnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getDraftKey(draft.userId), JSON.stringify(draft));
}

export function clearTalentBuyerDraft(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getDraftKey(userId));
}
