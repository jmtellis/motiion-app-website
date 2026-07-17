import type { ActivityType } from "@/lib/talent-buyers/activities/types";

export type ActivityComposerStepId =
  | "type"
  | "basics"
  | "details"
  | "learning"
  | "experience"
  | "dates"
  | "tickets"
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
    case "attendees":
      return "Attendees";
    case "extras":
      return "Extras";
    case "settings":
      return "Settings";
    case "publish":
      return "Publish";
  }
}

export const CLASS_SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"] as const;
export const CLASS_FOCUSES = ["Technique", "Choreography", "Conditioning", "Improvisation", "Performance"] as const;
export const CLASS_INTENSITIES = ["Low", "Medium", "High"] as const;
export const SESSION_VIBES = ["Chill", "Energetic", "Focused", "Social", "Competitive"] as const;
export const EVENT_TYPES = [
  "Showcase",
  "Competition",
  "Industry mixer",
  "Workshop weekend",
  "Audition",
  "Other",
] as const;
