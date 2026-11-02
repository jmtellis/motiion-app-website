import type { TalentBuyerOnboardingDraft, TalentBuyerOnboardingStep } from "@/types/talent-buyers";
import { talentBuyerSteps } from "@/lib/talent-buyers/onboarding";

const CURRENT_DRAFT_VERSION = 3 as const;

function getDraftKey(userId: string) {
  return `motiion:talent-buyer-onboarding:${userId}`;
}

function isKnownStep(value: unknown): value is TalentBuyerOnboardingStep {
  return typeof value === "string" && (talentBuyerSteps as string[]).includes(value);
}

/**
 * Load a v3 draft. Older drafts (v1/v2 / missing version) are discarded so users
 * restart on the refreshed flow instead of landing on removed steps.
 */
export function loadTalentBuyerDraft(userId: string): TalentBuyerOnboardingDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(getDraftKey(userId));
    if (!rawDraft) return null;
    const parsed = JSON.parse(rawDraft) as Partial<TalentBuyerOnboardingDraft> & {
      version?: number;
    };

    if (parsed.version !== CURRENT_DRAFT_VERSION || parsed.userId !== userId) {
      try { window.localStorage.removeItem(getDraftKey(userId)); } catch { /* storage is optional */ }
      return null;
    }

    if (!isKnownStep(parsed.currentStep)) {
      try { window.localStorage.removeItem(getDraftKey(userId)); } catch { /* storage is optional */ }
      return null;
    }

    return parsed as TalentBuyerOnboardingDraft;
  } catch {
    return null;
  }
}

export function saveTalentBuyerDraft(draft: TalentBuyerOnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try { window.localStorage.setItem(getDraftKey(draft.userId), JSON.stringify(draft)); } catch { /* keep the current draft in memory */ }
}

export function clearTalentBuyerDraft(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try { window.localStorage.removeItem(getDraftKey(userId)); } catch { /* storage is optional */ }
}
