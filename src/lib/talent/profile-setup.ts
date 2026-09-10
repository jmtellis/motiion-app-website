/**
 * Direct port of iOS TalentDeferredProfileSetup + TalentAttributeCompletion.
 * Both platforms must derive completion from the same field rules over the same rows.
 */

import { skipLaterCopy } from "@/lib/talent/copy";

export type DeferredSetupStep =
  | "resumeImport"
  | "profileIdentity"
  | "headshots"
  | "attributesMenu"
  | "talentSubtypes"
  | "sizing"
  | "workingLocations"
  | "representation"
  | "unionStatus"
  | "addStyles"
  | "addSkills"
  | "addCredits"
  | "submitForReview";

export type AttributeField =
  | "gender"
  | "ethnicity"
  | "height"
  | "hairColor"
  | "eyeColor"
  | "sizing"
  | "workingLocations"
  | "representation"
  | "unionStatus";

/** Optional skips that used to live in iOS UserDefaults — now profiles.deferred_setup_skipped. */
export type DeferredSetupSkipped = Partial<Record<"sizing" | "representation" | "unionStatus", boolean>>;

export type TalentSetupProfile = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  talentTypes?: string[] | null;
  headshotUrls?: string[] | null;
  headshotOriginalUrls?: string[] | null;
  resumeUrl?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  height?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  sizing?: string | null;
  workingLocations?: string[] | null;
  representation?: string | null;
  agent?: string | null;
  unionStatus?: string | null;
  styles?: string[] | null;
  skills?: string[] | null;
  experiences?: unknown[] | null;
  profileSetupCompletedAt?: string | null;
  deferredSetupSkipped?: DeferredSetupSkipped | null;
};

export const deferredStepsOrdered: DeferredSetupStep[] = [
  "resumeImport",
  "profileIdentity",
  "headshots",
  "attributesMenu",
  "talentSubtypes",
  "sizing",
  "workingLocations",
  "representation",
  "unionStatus",
  "addStyles",
  "addSkills",
  "addCredits",
  "submitForReview",
];

export const physicalTalentDetailSteps = new Set<DeferredSetupStep>(["sizing", "addSkills"]);

export const reviewUntilCompleteSteps = new Set<DeferredSetupStep>([
  "headshots",
  "profileIdentity",
  "addStyles",
  "addSkills",
  "addCredits",
  "attributesMenu",
  "representation",
]);

const skippableAttributeFields = new Set<AttributeField>(["sizing", "representation"]);

export function shouldSkipPhysicalTalentDetails(talentTypes: string[] | null | undefined): boolean {
  const normalized = new Set(
    (talentTypes ?? [])
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  return (
    normalized.has("choreographer") && !normalized.has("dancer") && !normalized.has("instructor")
  );
}

function hasStoredValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasAcknowledged(
  field: "sizing" | "representation" | "unionStatus",
  skipped: DeferredSetupSkipped | null | undefined,
): boolean {
  return Boolean(skipped?.[field]);
}

export function isAttributeFilled(
  field: AttributeField,
  profile: TalentSetupProfile,
): boolean {
  const skipped = profile.deferredSetupSkipped ?? null;
  switch (field) {
    case "gender":
      return hasStoredValue(profile.gender);
    case "ethnicity":
      return hasStoredValue(profile.ethnicity);
    case "height":
      return hasStoredValue(profile.height);
    case "hairColor":
      return hasStoredValue(profile.hairColor);
    case "eyeColor":
      return hasStoredValue(profile.eyeColor);
    case "workingLocations":
      return (profile.workingLocations ?? []).some((item) => hasStoredValue(item));
    case "unionStatus":
      return hasStoredValue(profile.unionStatus) || hasAcknowledged("unionStatus", skipped);
    case "sizing":
      if (hasStoredValue(profile.sizing)) return true;
      return (
        Boolean(profile.profileSetupCompletedAt) || hasAcknowledged("sizing", skipped)
      );
    case "representation":
      if (hasStoredValue(profile.representation) || hasStoredValue(profile.agent)) return true;
      return (
        Boolean(profile.profileSetupCompletedAt) || hasAcknowledged("representation", skipped)
      );
    default:
      return false;
  }
}

export function isAttributesMenuFilled(
  profile: TalentSetupProfile,
  skipPhysicalTalentDetails = shouldSkipPhysicalTalentDetails(profile.talentTypes),
): boolean {
  const fields: AttributeField[] = skipPhysicalTalentDetails
    ? ["gender", "ethnicity"]
    : ["gender", "ethnicity", "height", "hairColor", "eyeColor"];
  return fields.every((field) => isAttributeFilled(field, profile));
}

export function hasAtLeastOneHeadshot(profile: TalentSetupProfile): boolean {
  return (profile.headshotUrls ?? []).some((url) => hasStoredValue(url));
}

export function isStepFilled(step: DeferredSetupStep, profile: TalentSetupProfile): boolean {
  switch (step) {
    case "resumeImport":
      return false;
    case "profileIdentity": {
      const first = profile.firstName?.trim() ?? "";
      const last = profile.lastName?.trim() ?? "";
      const display = profile.displayName?.trim() ?? "";
      return Boolean(first && last && display);
    }
    case "attributesMenu":
      return isAttributesMenuFilled(profile);
    case "headshots":
      return hasAtLeastOneHeadshot(profile);
    case "talentSubtypes":
      return (profile.talentTypes ?? []).length > 0;
    case "sizing":
      return isAttributeFilled("sizing", profile);
    case "workingLocations":
      return isAttributeFilled("workingLocations", profile);
    case "representation":
      return isAttributeFilled("representation", profile);
    case "unionStatus":
      return isAttributeFilled("unionStatus", profile);
    case "addStyles":
      return (profile.styles ?? []).length > 0;
    case "addSkills":
      return (profile.skills ?? []).length > 0;
    case "addCredits":
      return (profile.experiences ?? []).length > 0;
    case "submitForReview":
      return false;
    default:
      return false;
  }
}

export function unfilledSteps(profile: TalentSetupProfile): DeferredSetupStep[] {
  const skipPhysical = shouldSkipPhysicalTalentDetails(profile.talentTypes);
  return deferredStepsOrdered.filter((step) => {
    if (skipPhysical && physicalTalentDetailSteps.has(step)) return false;
    if (step === "resumeImport") {
      return (
        !profile.profileSetupCompletedAt &&
        !(profile.resumeUrl ?? "").trim()
      );
    }
    if (step === "submitForReview") return false;
    if (reviewUntilCompleteSteps.has(step)) {
      return !profile.profileSetupCompletedAt;
    }
    return !isStepFilled(step, profile);
  });
}

export function isFullyFilled(profile: TalentSetupProfile): boolean {
  const skipPhysical = shouldSkipPhysicalTalentDetails(profile.talentTypes);
  return deferredStepsOrdered
    .filter((step) => step !== "resumeImport" && step !== "submitForReview")
    .filter((step) => !(skipPhysical && physicalTalentDetailSteps.has(step)))
    .every((step) => isStepFilled(step, profile));
}

export function isSetupFinished(profile: TalentSetupProfile): boolean {
  if (profile.profileSetupCompletedAt) return true;
  return isFullyFilled(profile);
}

export function skipTitleForStep(step: DeferredSetupStep): string {
  switch (step) {
    case "resumeImport":
      return skipLaterCopy.resumeImport;
    case "sizing":
      return skipLaterCopy.sizing;
    case "representation":
      return skipLaterCopy.representation;
    case "unionStatus":
      return skipLaterCopy.unionStatus;
    case "addStyles":
      return skipLaterCopy.addStyles;
    case "addSkills":
      return skipLaterCopy.addSkills;
    case "addCredits":
      return skipLaterCopy.addCredits;
    case "submitForReview":
      return skipLaterCopy.submitForReview;
    default:
      return skipLaterCopy.default;
  }
}

export function isSkippableStep(step: DeferredSetupStep): boolean {
  return (
    step === "resumeImport" ||
    step === "sizing" ||
    step === "representation" ||
    step === "unionStatus" ||
    step === "addStyles" ||
    step === "addSkills" ||
    step === "addCredits" ||
    step === "submitForReview"
  );
}

export function acknowledgeSkip(
  step: DeferredSetupStep,
  current: DeferredSetupSkipped | null | undefined,
): DeferredSetupSkipped {
  const next = { ...(current ?? {}) };
  if (step === "sizing" || step === "representation" || step === "unionStatus") {
    next[step] = true;
  }
  return next;
}

export type ProfileReviewStatus = "not_submitted" | "pending" | "approved" | "declined";

export type ChecklistAction =
  | "finishSetup"
  | "submitProfile"
  | "addHighlight"
  | "linkExperience"
  | "addMeasurements"
  | "connectSocials"
  | "shareProfile";

export type ChecklistItem = {
  id: ChecklistAction;
  title: string;
  isComplete: boolean;
  action: ChecklistAction;
};

/** Mirrors TalentHomeViewModel.buildChecklist (sans verifyIdentity). */
export function buildChecklist(input: {
  profile: TalentSetupProfile;
  reviewStatus: ProfileReviewStatus;
  highlightsCount: number;
  socialCount: number;
  hasSharedDigitalProfile?: boolean;
}): ChecklistItem[] {
  const { profile, reviewStatus } = input;
  const skipPhysical = shouldSkipPhysicalTalentDetails(profile.talentTypes);
  const items: ChecklistItem[] = [
    {
      id: "finishSetup",
      title: "Finish setting up your profile",
      isComplete: isSetupFinished(profile),
      action: "finishSetup",
    },
    {
      id: "submitProfile",
      title: "Submit for Motiion review",
      isComplete: reviewStatus === "pending" || reviewStatus === "approved",
      action: "submitProfile",
    },
    {
      id: "addHighlight",
      title: "Add a highlight",
      isComplete: input.highlightsCount > 0,
      action: "addHighlight",
    },
    {
      id: "linkExperience",
      title: "Link an experience",
      isComplete: (profile.experiences ?? []).length > 0,
      action: "linkExperience",
    },
  ];

  if (!skipPhysical) {
    items.push({
      id: "addMeasurements",
      title: "Add your measurements",
      isComplete: isAttributeFilled("sizing", profile),
      action: "addMeasurements",
    });
  }

  items.push(
    {
      id: "connectSocials",
      title: "Connect your socials",
      isComplete: input.socialCount > 0,
      action: "connectSocials",
    },
    {
      id: "shareProfile",
      title: "Share your digital profile",
      isComplete: Boolean(input.hasSharedDigitalProfile),
      action: "shareProfile",
    },
  );

  return items;
}

export function focusWindow(items: ChecklistItem[]): ChecklistItem[] {
  const incomplete = items.filter((item) => !item.isComplete);
  if (incomplete.length === 0) return [];
  const completed = items.filter((item) => item.isComplete);
  if (completed.length === 0) return incomplete.slice(0, 3);
  return [completed[completed.length - 1]!, ...incomplete.slice(0, 2)];
}

export function primaryCtaTitle(
  completedCount: number,
  nextAction: ChecklistAction | undefined,
): "Start" | "Resume" | "Submit" {
  if (nextAction === "submitProfile") return "Submit";
  return completedCount > 0 ? "Resume" : "Start";
}

export function statusLineForReview(status: ProfileReviewStatus): string | null {
  if (status === "pending") return "Your profile is under review";
  if (status === "approved") return "Your profile is Motiion approved";
  return null;
}

export { skippableAttributeFields };
