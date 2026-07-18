import type { TalentBuyerOnboardingDraft, TalentBuyerOnboardingStep } from "@/types/talent-buyers";
import { talentBuyerSteps } from "@/lib/talent-buyers/onboarding";

const CURRENT_DRAFT_VERSION = 2 as const;

function getDraftKey(userId: string) {
  return `motiion:talent-buyer-onboarding:${userId}`;
}

function isKnownStep(value: unknown): value is TalentBuyerOnboardingStep {
  return typeof value === "string" && (talentBuyerSteps as string[]).includes(value);
}

/**
 * Load a v2 draft. Older drafts (v1 / missing version) are discarded so users
 * restart on the shortened flow instead of landing on removed steps.
 */
export function loadTalentBuyerDraft(userId: string): TalentBuyerOnboardingDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.localStorage.getItem(getDraftKey(userId));
  if (!rawDraft) return null;

  try {
    const parsed = JSON.parse(rawDraft) as Partial<TalentBuyerOnboardingDraft> & {
      version?: number;
    };

    if (parsed.version !== CURRENT_DRAFT_VERSION || parsed.userId !== userId) {
      window.localStorage.removeItem(getDraftKey(userId));
      return null;
    }

    if (!isKnownStep(parsed.currentStep)) {
      window.localStorage.removeItem(getDraftKey(userId));
      return null;
    }

    return parsed as TalentBuyerOnboardingDraft;
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
