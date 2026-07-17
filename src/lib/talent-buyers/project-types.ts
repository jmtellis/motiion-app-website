/**
 * Canonical project types for the buyer project workspace.
 * Legacy DB values are normalized via getNormalizedProjectType().
 */

export type ProjectType =
  | "job"
  | "casting"
  | "audition"
  | "campaign"
  | "tour"
  | "production"
  | "event"
  | "talent_submission"
  | "client_presentation"
  | "class_program"
  | "training_program"
  | "internal_planning";

/** @deprecated Prefer ProjectType — kept as an alias for existing imports. */
export type BuyerProjectType = ProjectType;

export const PROJECT_TYPES: ProjectType[] = [
  "job",
  "casting",
  "audition",
  "campaign",
  "tour",
  "production",
  "event",
  "talent_submission",
  "client_presentation",
  "class_program",
  "training_program",
  "internal_planning",
];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  job: "Job",
  casting: "Casting",
  audition: "Audition",
  campaign: "Campaign",
  tour: "Tour",
  production: "Production",
  event: "Event",
  talent_submission: "Talent Submission",
  client_presentation: "Client Presentation",
  class_program: "Class Program",
  training_program: "Training Program",
  internal_planning: "Internal Planning",
};

export const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  casting: "Find, review, shortlist and select talent for one or more roles.",
  audition: "Invite, register, check in and evaluate talent through an audition process.",
  talent_submission: "Recommend and package roster talent for an external opportunity.",
  client_presentation: "Curate talent into a polished presentation for client review.",
  job: "Coordinate booked talent, rehearsals, fittings, schedules and deliverables.",
  tour: "Manage talent and production logistics across multiple cities and dates.",
  production:
    "Coordinate talent and operations for a commercial, music video, film or live production.",
  campaign: "Manage connected castings, events, deliverables and approvals for a campaign.",
  event: "Plan and operate an activation, launch, appearance or live event.",
  class_program: "Organize a schedule of classes, instructors, enrollment and attendance.",
  training_program: "Manage an intensive, workshop series, bootcamp or development program.",
  internal_planning: "Organize tasks, notes, milestones, budgets and early-stage ideas.",
};

/** Maps stored legacy values onto canonical ProjectType. */
export const LEGACY_PROJECT_TYPE_MAP: Record<string, ProjectType> = {
  agency_submission: "talent_submission",
  casting: "casting",
  event: "event",
  tour: "tour",
  production: "production",
  client_presentation: "client_presentation",
  internal_planning: "internal_planning",
  job: "job",
  audition: "audition",
  campaign: "campaign",
  talent_submission: "talent_submission",
  class_program: "class_program",
  training_program: "training_program",
};

export type ProjectTypeIntentionGroup = {
  id: string;
  label: string;
  types: ProjectType[];
};

export const PROJECT_TYPE_INTENTION_GROUPS: ProjectTypeIntentionGroup[] = [
  {
    id: "find_present",
    label: "Find & Present Talent",
    types: ["casting", "audition", "talent_submission", "client_presentation"],
  },
  {
    id: "manage_work",
    label: "Manage Work",
    types: ["job", "tour", "production"],
  },
  {
    id: "campaigns_experiences",
    label: "Campaigns & Experiences",
    types: ["campaign", "event"],
  },
  {
    id: "education",
    label: "Education & Development",
    types: ["class_program", "training_program"],
  },
  {
    id: "plan",
    label: "Plan",
    types: ["internal_planning"],
  },
];

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as string[]).includes(value);
}

export function getNormalizedProjectType(raw: string | null | undefined): ProjectType {
  if (!raw) return "production";
  const mapped = LEGACY_PROJECT_TYPE_MAP[raw] ?? (isProjectType(raw) ? raw : null);
  return mapped ?? "production";
}

export function getProjectTypeLabel(raw: string | null | undefined): string {
  return PROJECT_TYPE_LABELS[getNormalizedProjectType(raw)];
}

export type ProjectOverviewSection = "meta" | "items" | "talent";

/** Which generic overview blocks to show (casting uses CastingOverviewPanel instead). */
export function getProjectOverviewSections(raw: string | null | undefined): ProjectOverviewSection[] {
  const type = getNormalizedProjectType(raw);
  if (type === "casting") return [];
  return ["meta", "items", "talent"];
}
