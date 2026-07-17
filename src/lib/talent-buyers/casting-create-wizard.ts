import type { CastingComposerForm } from "@/types/casting";
import type { ProjectComposerForm } from "@/types/project";

import { validateCastingStep } from "./casting-schema";
import type { BreakdownPrefillSources } from "./breakdown-prefill";

export type CastingWizardPath = "breakdown" | "scratch";

export type CastingWizardStepId =
  | "start"
  | "breakdown"
  | "breakdown_review"
  | "basics"
  | "type_visibility"
  | "schedule"
  | "where"
  | "compensation"
  | "submission"
  | "roles"
  | "review";

export type CastingWizardStep = {
  id: CastingWizardStepId;
  title: string;
  subtitle: string;
  contextHint: string;
};

const SHARED_STEPS: CastingWizardStep[] = [
  {
    id: "basics",
    title: "Project Basics",
    subtitle: "Add a client, set union status, and describe the casting.",
    contextHint: "A clear title helps talent recognize the opportunity instantly.",
  },
  {
    id: "type_visibility",
    title: "Casting Type & Visibility",
    subtitle: "Choose the format and who can discover this casting.",
    contextHint: "Visibility controls whether this is an open call or invite-only.",
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Choose which dates matter, then fill in only what applies.",
    contextHint: "Dates help talent check availability before submitting.",
  },
  {
    id: "where",
    title: "Location",
    subtitle: "Set locations for each schedule type you selected.",
    contextHint: "Production is where the job happens. Auditions can be in person or remote.",
  },
  {
    id: "compensation",
    title: "Compensation",
    subtitle: "How is talent paid for this project?",
    contextHint: "Clear pay details reduce back-and-forth with applicants.",
  },
  {
    id: "submission",
    title: "How Talent Submits",
    subtitle: "Choose what talent must include from their Motiion profile.",
    contextHint: "Make it easy for talent to know exactly what to send.",
  },
  {
    id: "roles",
    title: "Roles",
    subtitle: "Define who you are casting for.",
    contextHint: "Each role can have its own requirements and headcount.",
  },
  {
    id: "review",
    title: "Review & Publish",
    subtitle: "Confirm everything looks right, then publish your casting.",
    contextHint: "You can save a draft and return anytime.",
  },
];

export const CASTING_WIZARD_STEP_MAP: Record<CastingWizardStepId, CastingWizardStep> = {
  start: {
    id: "start",
    title: "How Are You Starting?",
    subtitle: "Upload a breakdown to prefill details, or build from scratch.",
    contextHint: "Most teams save time by uploading an existing breakdown or brief.",
  },
  breakdown: {
    id: "breakdown",
    title: "Upload Your Breakdown",
    subtitle: "We'll read your document and prefill project details.",
    contextHint: "PDFs and images up to 20 MB are supported.",
  },
  breakdown_review: {
    id: "breakdown_review",
    title: "Your Casting Breakdown",
    subtitle: "Review the extracted casting in plain language. Edit anything here, then continue only for what's still missing.",
    contextHint: "Not everything may be in your document — you'll fill gaps in the next steps.",
  },
  ...Object.fromEntries(SHARED_STEPS.map((step) => [step.id, step])) as Record<
    Exclude<CastingWizardStepId, "start" | "breakdown" | "breakdown_review">,
    CastingWizardStep
  >,
};

export function getWizardStepSequence(path: CastingWizardPath): CastingWizardStepId[] {
  if (path === "breakdown") {
    return [
      "start",
      "breakdown",
      "breakdown_review",
      "basics",
      "type_visibility",
      "schedule",
      "where",
      "compensation",
      "submission",
      "roles",
      "review",
    ];
  }

  return [
    "start",
    "basics",
    "type_visibility",
    "schedule",
    "where",
    "compensation",
    "submission",
    "roles",
    "review",
  ];
}

export function getWizardStepIndex(path: CastingWizardPath, stepId: CastingWizardStepId) {
  return getWizardStepSequence(path).indexOf(stepId);
}

export function getNextWizardStep(
  path: CastingWizardPath,
  stepId: CastingWizardStepId,
): CastingWizardStepId | null {
  const sequence = getWizardStepSequence(path);
  const index = sequence.indexOf(stepId);
  if (index < 0 || index >= sequence.length - 1) return null;
  return sequence[index + 1] ?? null;
}

export function getPreviousWizardStep(
  path: CastingWizardPath,
  stepId: CastingWizardStepId,
): CastingWizardStepId | null {
  const sequence = getWizardStepSequence(path);
  const index = sequence.indexOf(stepId);
  if (index <= 0) return null;
  return sequence[index - 1] ?? null;
}

export function getWizardProgress(
  path: CastingWizardPath,
  stepId: CastingWizardStepId,
  incompleteSteps?: CastingWizardStepId[],
) {
  const contentSteps =
    path === "scratch"
      ? getWizardStepSequence(path).filter((id) => id !== "start")
      : incompleteSteps?.length
        ? incompleteSteps
        : (["review"] as CastingWizardStepId[]);

  const currentIndex = contentSteps.indexOf(stepId);
  const total = contentSteps.length;
  const current = currentIndex >= 0 ? currentIndex + 1 : 1;
  const percent = total > 0 ? Math.round((Math.min(current, total) / total) * 100) : 0;

  return {
    current: Math.min(current, total || 1),
    total: total || 1,
    percent,
  };
}

function hasRoleTitles(form: CastingComposerForm) {
  return form.roles.length > 0 && form.roles.every((role) => role.title.trim());
}

function hasClient(form: CastingComposerForm) {
  return (
    form.configuration.confidential_project_client || Boolean(form.productionCompany.trim())
  );
}

function hasCastingType(form: CastingComposerForm) {
  return form.configuration.casting_kinds.length > 0 || Boolean(form.configuration.casting_kind);
}

function validateCompensationDetails(form: CastingComposerForm): string | null {
  const category = form.configuration.compensation_category_raw;
  if (!category) return "Choose how talent is compensated.";
  if (category !== "paid") return null;

  if (form.isUnion === true) {
    const rates = form.rateDetails;
    if (
      rates.shoot_day == null &&
      rates.weekly_rate == null &&
      rates.fixed_amount == null &&
      rates.rehearsal == null
    ) {
      return "Select a union scale so rates can populate.";
    }
    return null;
  }

  if (form.isUnion !== false) {
    return "Choose Union or Non-union on Project Basics before setting pay.";
  }

  if (form.rateType === "fixed") {
    if (form.rateDetails.fixed_amount == null) return "Enter the total fee.";
    return null;
  }

  if (form.rateType === "segmented") {
    const rates = form.rateDetails;
    if (
      rates.rehearsal == null &&
      rates.shoot_day == null &&
      rates.travel_day == null &&
      rates.per_diem == null
    ) {
      return "Enter at least one day rate.";
    }
    return null;
  }

  if (form.rateType === "tbd") {
    if (!form.configuration.compensation_amount_notes?.trim()) {
      return "Describe how talent will be paid.";
    }
    return null;
  }

  return null;
}

/** Required / gap checks used after breakdown upload — skip steps that already look complete. */
export function isWizardStepComplete(stepId: CastingWizardStepId, castingForm: CastingComposerForm): boolean {
  switch (stepId) {
    case "basics":
      return (
        Boolean(castingForm.title.trim()) &&
        Boolean(castingForm.description.trim()) &&
        hasClient(castingForm) &&
        castingForm.isUnion !== null
      );
    case "type_visibility":
      return hasCastingType(castingForm) && castingForm.visibility !== null;
    case "schedule":
    case "where":
    case "submission":
      // Optional steps — never block the breakdown shortcut path.
      return true;
    case "compensation":
      return validateCompensationDetails(castingForm) === null;
    case "roles":
      return hasRoleTitles(castingForm);
    case "review":
      return true;
    default:
      return true;
  }
}

const BREAKDOWN_GAP_STEPS: CastingWizardStepId[] = [
  "basics",
  "type_visibility",
  "compensation",
  "roles",
  "review",
];

/**
 * After a breakdown upload, only walk through steps that are still incomplete.
 * Optional schedule / location / submission can be edited on the document.
 */
export function getIncompleteContentSteps(castingForm: CastingComposerForm): CastingWizardStepId[] {
  const missing = BREAKDOWN_GAP_STEPS.filter(
    (stepId) => stepId === "review" || !isWizardStepComplete(stepId, castingForm),
  );
  return missing.length ? missing : (["review"] as CastingWizardStepId[]);
}

export function getNextIncompleteStep(
  castingForm: CastingComposerForm,
  currentStepId: CastingWizardStepId,
): CastingWizardStepId | null {
  const sequence = getIncompleteContentSteps(castingForm);
  if (currentStepId === "breakdown_review") {
    return sequence[0] ?? "review";
  }
  const index = sequence.indexOf(currentStepId);
  if (index < 0) return sequence[0] ?? "review";
  return sequence[index + 1] ?? null;
}

export function getPreviousIncompleteStep(
  castingForm: CastingComposerForm,
  currentStepId: CastingWizardStepId,
): CastingWizardStepId | null {
  if (currentStepId === "breakdown_review") return "breakdown";
  const sequence = getIncompleteContentSteps(castingForm);
  const index = sequence.indexOf(currentStepId);
  if (index < 0) return "breakdown_review";
  if (index === 0) return "breakdown_review";
  return sequence[index - 1] ?? "breakdown_review";
}

export function isWizardStepPrefilled(
  stepId: CastingWizardStepId,
  containerForm: ProjectComposerForm,
  castingForm: CastingComposerForm,
  prefillSources: BreakdownPrefillSources,
): boolean {
  void containerForm;
  switch (stepId) {
    case "basics":
      return prefillSources.sections.has("basics") && isWizardStepComplete("basics", castingForm);
    case "type_visibility":
      return (
        prefillSources.sections.has("type_visibility") &&
        isWizardStepComplete("type_visibility", castingForm)
      );
    case "schedule":
      return (
        prefillSources.sections.has("schedule") &&
        Boolean(castingForm.startDate || castingForm.configuration.submission_deadline_iso8601)
      );
    case "where":
      return (
        prefillSources.sections.has("where") &&
        Boolean(castingForm.location || castingForm.configuration.location_city)
      );
    case "compensation":
      return (
        prefillSources.sections.has("compensation") && isWizardStepComplete("compensation", castingForm)
      );
    case "submission":
      return prefillSources.sections.has("submission");
    case "roles":
      return prefillSources.sections.has("roles") && hasRoleTitles(castingForm);
    default:
      return false;
  }
}

export function validateCastingWizardStep(
  stepId: CastingWizardStepId,
  containerForm: ProjectComposerForm,
  castingForm: CastingComposerForm,
): string | null {
  switch (stepId) {
    case "start":
      return "Choose how you want to start.";
    case "breakdown":
    case "breakdown_review":
      return null;
    case "basics": {
      if (!castingForm.title.trim() && !containerForm.title.trim()) {
        return "Give your casting a title.";
      }
      if (!castingForm.description.trim() && !containerForm.description.trim()) {
        return "Add a description.";
      }
      if (!hasClient(castingForm)) {
        return "Add a client or choose Undisclosed client.";
      }
      if (castingForm.isUnion === null) {
        return "Choose Union or Non-union.";
      }
      return null;
    }
    case "type_visibility":
      if (!hasCastingType(castingForm)) return "Choose a casting type.";
      if (castingForm.visibility === null) return "Choose who can see this casting.";
      return null;
    case "schedule":
    case "where":
    case "submission":
      return null;
    case "compensation":
      return validateCompensationDetails(castingForm);
    case "roles":
      if (!hasRoleTitles(castingForm)) {
        return "Add at least one role with a title.";
      }
      return null;
    case "review":
      return (
        validateCastingWizardStep("basics", containerForm, castingForm) ??
        validateCastingWizardStep("type_visibility", containerForm, castingForm) ??
        validateCastingWizardStep("compensation", containerForm, castingForm) ??
        validateCastingWizardStep("roles", containerForm, castingForm) ??
        validateCastingStep("roles", castingForm as never)
      );
    default:
      return null;
  }
}

export function syncContainerAndCasting(
  container: ProjectComposerForm,
  casting: CastingComposerForm,
): { container: ProjectComposerForm; casting: CastingComposerForm } {
  // Do not trim live string values here — trimming while typing drops spaces in controlled inputs.
  const title = casting.title || container.title;
  const description = casting.description || container.description;
  const productionCompany = casting.productionCompany || container.productionCompany;

  const castingAttachments = casting.configuration.attachments ?? [];
  const containerAttachments = container.configuration.attachments ?? [];
  const attachments = castingAttachments.length ? castingAttachments : containerAttachments;

  return {
    container: {
      ...container,
      title,
      description,
      productionCompany,
      startDate: casting.startDate || container.startDate,
      endDate: casting.endDate || container.endDate,
      location: casting.location || container.location,
      coverImageUrl: container.coverImageUrl || casting.coverImageUrl,
      configuration: {
        ...container.configuration,
        attachments,
      },
    },
    casting: {
      ...casting,
      title: casting.title,
      description: casting.description,
      productionCompany: casting.productionCompany,
      startDate: casting.startDate || container.startDate,
      endDate: casting.endDate || container.endDate,
      location: casting.location || container.location,
      coverImageUrl: container.coverImageUrl || casting.coverImageUrl,
      configuration: {
        ...casting.configuration,
        // iOS attachments read projects.casting_configuration.attachments
        attachments,
      },
    },
  };
}
