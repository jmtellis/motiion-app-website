import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CalendarDays,
  Clapperboard,
  Dumbbell,
  Film,
  GraduationCap,
  Map,
  Megaphone,
  Mic,
  NotebookPen,
  Presentation,
  Send,
} from "lucide-react";

import { getNormalizedProjectType, type ProjectType } from "@/lib/talent-buyers/project-types";

const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  casting: Clapperboard,
  audition: Mic,
  talent_submission: Send,
  client_presentation: Presentation,
  job: Briefcase,
  tour: Map,
  production: Film,
  campaign: Megaphone,
  event: CalendarDays,
  class_program: GraduationCap,
  training_program: Dumbbell,
  internal_planning: NotebookPen,
};

/** Footer tile accent tint keyed by project type. */
export type ProjectTypeAccent = "accent" | "warm" | "green" | "violet" | "neutral";

const PROJECT_TYPE_ACCENTS: Record<ProjectType, ProjectTypeAccent> = {
  casting: "accent",
  audition: "violet",
  talent_submission: "accent",
  client_presentation: "violet",
  job: "neutral",
  tour: "warm",
  production: "neutral",
  campaign: "warm",
  event: "warm",
  class_program: "green",
  training_program: "green",
  internal_planning: "neutral",
};

export function getProjectTypeIcon(raw: string | null | undefined): LucideIcon {
  return PROJECT_TYPE_ICONS[getNormalizedProjectType(raw)];
}

export function getProjectTypeAccent(raw: string | null | undefined): ProjectTypeAccent {
  return PROJECT_TYPE_ACCENTS[getNormalizedProjectType(raw)];
}

export function getProjectTypeStockCategory(raw: string | null | undefined): "project" | "event" {
  const type = getNormalizedProjectType(raw);
  return type === "event" || type === "tour" || type === "campaign" ? "event" : "project";
}
