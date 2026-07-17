export type ScheduledActivityType = "class" | "session" | "event";

export type ProjectAddOptionIcon = "clapperboard" | "graduation-cap" | "users" | "calendar";

export type ProjectAddOptionAction =
  | { kind: "casting" }
  | { kind: "scheduled-activity"; activityType: ScheduledActivityType };

export type ProjectAddOption = {
  id: string;
  label: string;
  description: string;
  icon: ProjectAddOptionIcon;
  action: ProjectAddOptionAction;
  /** Lower sorts first. */
  order: number;
};

/**
 * Registry of items a buyer can add to a project workspace.
 * Append new entries here to extend the Add picker without UI changes.
 */
const PROJECT_ADD_OPTIONS_UNSORTED: ProjectAddOption[] = [
  {
    id: "casting",
    label: "Casting",
    description: "Post roles and collect talent submissions",
    icon: "clapperboard",
    action: { kind: "casting" },
    order: 10,
  },
  {
    id: "class",
    label: "Class",
    description: "Schedule a recurring or one-off class",
    icon: "graduation-cap",
    action: { kind: "scheduled-activity", activityType: "class" },
    order: 20,
  },
  {
    id: "session",
    label: "Session",
    description: "Book a rehearsal, workshop, or session",
    icon: "users",
    action: { kind: "scheduled-activity", activityType: "session" },
    order: 30,
  },
  {
    id: "event",
    label: "Event",
    description: "Add a performance, showcase, or event",
    icon: "calendar",
    action: { kind: "scheduled-activity", activityType: "event" },
    order: 40,
  },
];

export const PROJECT_ADD_OPTIONS = [...PROJECT_ADD_OPTIONS_UNSORTED].sort((a, b) => a.order - b.order);

export function getProjectAddOptions(): ProjectAddOption[] {
  return PROJECT_ADD_OPTIONS;
}
