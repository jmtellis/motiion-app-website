import type { ActivityType } from "@/lib/talent-buyers/activities/types";

export type ActivityComposerStepId =
  | "type"
  | "basics"
  | "details"
  | "learning"
  | "experience"
  | "dates"
  | "tickets"
  | "promos"
  | "leads"
  | "attendees"
  | "extras"
  | "settings"
  | "publish";

export type ActivityCreateConfig = {
  pageTitle: string;
  lede: string;
  publishLabel: string;
  steps: ActivityComposerStepId[];
  titlePlaceholder: string;
  descriptionPlaceholder: string;
};

const CLASS_STEPS: ActivityComposerStepId[] = [
  "type",
  "details",
  "learning",
  "extras",
  "settings",
];

const SESSION_STEPS: ActivityComposerStepId[] = [
  "type",
  "details",
  "experience",
  "extras",
  "settings",
];

const EVENT_STEPS: ActivityComposerStepId[] = [
  "type",
  "basics",
  "dates",
  "tickets",
  "promos",
  "leads",
  "experience",
  "attendees",
  "publish",
];

export const ACTIVITY_CREATE_REGISTRY: Record<ActivityType, ActivityCreateConfig> = {
  class: {
    pageTitle: "Create class",
    lede: "Schedule a class, set capacity, and optionally sell tickets with Stripe.",
    publishLabel: "Publish class",
    steps: CLASS_STEPS,
    titlePlaceholder: "Contemporary technique",
    descriptionPlaceholder: "What will dancers work on in this class?",
  },
  session: {
    pageTitle: "Create session",
    lede: "Host a free practice or jam session for your community.",
    publishLabel: "Publish session",
    steps: SESSION_STEPS,
    titlePlaceholder: "Open floor freestyle",
    descriptionPlaceholder: "Describe the vibe and what to expect.",
  },
  event: {
    pageTitle: "Create event",
    lede: "Build a showcase or industry event with tickets, days, and check-in.",
    publishLabel: "Publish event",
    steps: EVENT_STEPS,
    titlePlaceholder: "Summer showcase",
    descriptionPlaceholder: "Tell guests what this event is about.",
  },
};

export function stepLabel(step: ActivityComposerStepId): string {
  switch (step) {
    case "type":
      return "Type";
    case "basics":
      return "Basics";
    case "details":
      return "Details";
    case "learning":
      return "Learning";
    case "experience":
      return "Experience";
    case "dates":
      return "Dates";
    case "tickets":
      return "Tickets";
    case "promos":
      return "Promos";
    case "leads":
      return "Leads";
    case "attendees":
      return "Guests";
    case "extras":
      return "Extras";
    case "settings":
      return "Settings";
    case "publish":
      return "Publish";
  }
}

/** Matches iOS `ClassCategoryHighLevel`. */
export const CLASS_CATEGORY_HIGH_LEVELS = ["Training", "Industry"] as const;

/** Matches iOS `ClassCategoryType` chips by high-level. */
export const CLASS_CATEGORY_TYPES_BY_HIGH_LEVEL: Record<
  (typeof CLASS_CATEGORY_HIGH_LEVELS)[number],
  readonly string[]
> = {
  Training: ["Technique", "Conditioning"],
  Industry: [
    "Workshop",
    "Intensive",
    "Master Class",
    "Audition Prep",
    "Repertoire",
    "Drop-In",
  ],
};

/** Matches iOS `ClassSkillLevel`. */
export const CLASS_SKILL_LEVELS = [
  "Open Level",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
] as const;

/** Matches iOS `ClassFocus`. */
export const CLASS_FOCUSES = [
  "Choreography",
  "Technique",
  "Performance",
  "Conditioning",
  "Audition Prep",
  "Freestyle",
  "Repertoire",
] as const;

/** Matches iOS `ClassIntensity`. */
export const CLASS_INTENSITIES = ["Low", "Moderate", "High", "Athletic"] as const;

/** Matches iOS `SessionCategoryType`. */
export const SESSION_TYPES = [
  "Freestyle Session",
  "Choreo Lab",
  "Improvisation",
  "Other",
] as const;

/** Matches iOS `SessionExperienceLevel`. */
export const SESSION_LEVELS = ["Open", "Beginner", "Intermediate", "Advanced", "Pro"] as const;

/** Matches iOS `SessionVibe`. */
export const SESSION_VIBES = [
  "Chill",
  "High energy",
  "Experimental",
  "Industry-focused",
] as const;

/** Matches iOS event category chips (`jobType` → `subcategory`). */
export const EVENT_TYPES = [
  "Community",
  "Competition",
  "Convention",
  "Fundraising",
  "Live Performance",
  "Networking",
  "Promotional",
  "Showcase",
  "Other",
] as const;

export function classTypeOptionsForHighLevel(highLevel: string): readonly string[] {
  if (highLevel === "Training" || highLevel === "Industry") {
    return CLASS_CATEGORY_TYPES_BY_HIGH_LEVEL[highLevel];
  }
  return [];
}
