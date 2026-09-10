/**
 * First-class create intents for the buyer MVP.
 * Job uses dedicated `/jobs/new`; Casting uses the project workspace;
 * Event/Class/Session use the activity wizard.
 */

export type BuyerCreateIntent = "casting" | "event" | "class" | "session" | "job";

export type BuyerCreateIntentOption = {
  value: BuyerCreateIntent;
  label: string;
  description: string;
};

export const BUYER_CREATE_INTENTS: readonly BuyerCreateIntent[] = [
  "job",
  "casting",
  "event",
  "class",
  "session",
] as const;

export const BUYER_CREATE_INTENT_OPTIONS: readonly BuyerCreateIntentOption[] = [
  {
    value: "job",
    label: "Job",
    description: "People, credits, and a join link for a production.",
  },
  {
    value: "casting",
    label: "Casting",
    description: "Find, review, shortlist, and select talent for one or more roles.",
  },
  {
    value: "event",
    label: "Event",
    description: "Tickets, guest list, check-in, and free lead invites for Motiion members.",
  },
  {
    value: "class",
    label: "Class",
    description: "Schedule a class, set capacity, and optionally sell tickets.",
  },
  {
    value: "session",
    label: "Session",
    description: "Host a free practice or jam session for your community.",
  },
];

export function isBuyerCreateIntent(value: string): value is BuyerCreateIntent {
  return (BUYER_CREATE_INTENTS as readonly string[]).includes(value);
}

export function createIntentPath(intent: BuyerCreateIntent, projectId?: string | null): string {
  if (intent === "casting") {
    return "/projects/new/casting";
  }
  if (intent === "job") {
    return "/jobs/new";
  }
  const params = new URLSearchParams({ type: intent });
  if (projectId) params.set("projectId", projectId);
  return `/calendar/new?${params.toString()}`;
}

export function getBuyerCreateIntentOption(intent: BuyerCreateIntent): BuyerCreateIntentOption {
  return (
    BUYER_CREATE_INTENT_OPTIONS.find((option) => option.value === intent) ??
    BUYER_CREATE_INTENT_OPTIONS[0]
  );
}
