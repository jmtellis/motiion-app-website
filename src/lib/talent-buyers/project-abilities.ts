/**
 * Composable projects (MOT-93): a generic project shell with modular abilities.
 *
 * Shared-schema contract with iOS (no migration):
 * - `projects.enabled_modules` JSONB carries one boolean per ability
 *   (`casting`, `roster`, `classes`) next to the legacy `activities` flag.
 * - `projects.project_configuration.composable` marks the row as a composable
 *   shell and holds paused abilities, prompt dismissal, and archive state.
 * - `projects.project_type` stays the column default (`production`); it is a
 *   soft label only and never drives composable routing.
 * - `projects.visibility` starts `private`. Abilities publish on their own rows
 *   (castings / activities), never by widening the whole project.
 */

import type { LucideIcon } from "lucide-react";
import { Clapperboard, GraduationCap, Users } from "lucide-react";

export type ProjectAbilityId = "casting" | "roster" | "classes";

/** Fixed scan order for icons on list rows and the project header. */
export const PROJECT_ABILITY_ORDER: readonly ProjectAbilityId[] = ["casting", "roster", "classes"];

export const COMPOSABLE_PROJECT_VERSION = 1;

export type ProjectAbilityStatus = "active" | "paused";

export type ProjectAbilityState = {
  id: ProjectAbilityId;
  status: ProjectAbilityStatus;
};

export type ComposableProjectConfig = {
  version: number;
  paused: ProjectAbilityId[];
  prompt_dismissed_at?: string | null;
  archived_at?: string | null;
  created_via?: string | null;
};

export type ProjectAbilityModules = {
  casting: boolean;
  activities: boolean;
  roster: boolean;
  classes: boolean;
};

export type ProjectAbilityDefinition = {
  id: ProjectAbilityId;
  label: string;
  /** "What do you need?" card title. */
  promptTitle: string;
  promptDescription: string;
  /** First step after the ability is enabled. */
  firstStepLabel: string;
  icon: LucideIcon;
  /** Talent-facing surface this ability can publish. */
  publishes: string;
};

export const PROJECT_ABILITIES: Record<ProjectAbilityId, ProjectAbilityDefinition> = {
  casting: {
    id: "casting",
    label: "Casting",
    promptTitle: "Cast dancers",
    promptDescription: "Add roles, open a call or invite talent, and review who applies.",
    firstStepLabel: "Add first role",
    icon: Clapperboard,
    publishes: "Open call",
  },
  roster: {
    id: "roster",
    label: "Roster",
    promptTitle: "Build a roster",
    promptDescription: "Keep confirmed dancers, their Talent Cards, and contacts together.",
    firstStepLabel: "Invite dancers",
    icon: Users,
    publishes: "Invite-only",
  },
  classes: {
    id: "classes",
    label: "Classes",
    promptTitle: "Run classes",
    promptDescription: "Schedule a series of sessions with capacity and attendance.",
    firstStepLabel: "Add first session",
    icon: GraduationCap,
    publishes: "Listed class",
  },
};

/** "I'm not sure" chips — they enable abilities, they are never stored as a type. */
export const PROJECT_ABILITY_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  abilities: ProjectAbilityId[];
}> = [
  { id: "showcase", label: "Showcase with auditions", abilities: ["casting", "roster"] },
  { id: "tour", label: "Tour with a fixed cast", abilities: ["roster"] },
  { id: "series", label: "Weekly class series", abilities: ["classes"] },
];

/** Hours after create before a zero-ability project shows the soft banner again. */
export const ZERO_ABILITY_BANNER_DELAY_HOURS = 24;

export function isProjectAbilityId(value: unknown): value is ProjectAbilityId {
  return typeof value === "string" && (PROJECT_ABILITY_ORDER as readonly string[]).includes(value);
}

export function sortAbilityIds(ids: Iterable<ProjectAbilityId>): ProjectAbilityId[] {
  const set = new Set(ids);
  return PROJECT_ABILITY_ORDER.filter((id) => set.has(id));
}

export function parseComposableConfig(projectConfiguration: unknown): ComposableProjectConfig | null {
  if (!projectConfiguration || typeof projectConfiguration !== "object") return null;
  const raw = (projectConfiguration as Record<string, unknown>).composable;
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const version = typeof record.version === "number" ? record.version : 0;
  if (version < 1) return null;
  const paused = Array.isArray(record.paused) ? record.paused.filter(isProjectAbilityId) : [];
  return {
    version,
    paused: sortAbilityIds(paused),
    prompt_dismissed_at: typeof record.prompt_dismissed_at === "string" ? record.prompt_dismissed_at : null,
    archived_at: typeof record.archived_at === "string" ? record.archived_at : null,
    created_via: typeof record.created_via === "string" ? record.created_via : null,
  };
}

export function isComposableProject(record: { project_configuration?: unknown } | null | undefined) {
  return Boolean(record && parseComposableConfig(record.project_configuration));
}

export function parseAbilityModules(value: unknown): ProjectAbilityModules {
  const modules = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    casting: modules.casting === true,
    activities: modules.activities === true,
    roster: modules.roster === true,
    classes: modules.classes === true,
  };
}

/** Enabled abilities in scan order, each marked active or paused. */
export function resolveProjectAbilities(record: {
  enabled_modules?: unknown;
  project_configuration?: unknown;
}): ProjectAbilityState[] {
  const modules = parseAbilityModules(record.enabled_modules);
  const paused = new Set(parseComposableConfig(record.project_configuration)?.paused ?? []);
  return PROJECT_ABILITY_ORDER.filter((id) => modules[id]).map((id) => ({
    id,
    status: paused.has(id) ? "paused" : "active",
  }));
}

/**
 * Project type the web workspace should behave as. A composable shell with the
 * Casting ability enabled reuses the casting workflow without rewriting the
 * stored `project_type` that iOS decodes.
 */
export function resolveWorkspaceProjectType(record: {
  project_type?: string | null;
  enabled_modules?: unknown;
  project_configuration?: unknown;
}): string | null {
  if (isComposableProject(record) && parseAbilityModules(record.enabled_modules).casting) {
    return "casting";
  }
  return record.project_type ?? null;
}

export function hasActiveAbility(abilities: ProjectAbilityState[], id: ProjectAbilityId) {
  return abilities.some((ability) => ability.id === id && ability.status === "active");
}

export function hasAbility(abilities: ProjectAbilityState[], id: ProjectAbilityId) {
  return abilities.some((ability) => ability.id === id);
}

export function buildComposableConfig(
  existing: ComposableProjectConfig | null,
  patch: Partial<ComposableProjectConfig> = {},
): ComposableProjectConfig {
  return {
    version: COMPOSABLE_PROJECT_VERSION,
    paused: sortAbilityIds(patch.paused ?? existing?.paused ?? []),
    prompt_dismissed_at:
      patch.prompt_dismissed_at !== undefined ? patch.prompt_dismissed_at : existing?.prompt_dismissed_at ?? null,
    archived_at: patch.archived_at !== undefined ? patch.archived_at : existing?.archived_at ?? null,
    created_via: patch.created_via ?? existing?.created_via ?? null,
  };
}

/**
 * Priority for the single combined next step after enabling several abilities
 * at once: Casting > Roster > Classes.
 */
export function primaryAbilityForNextStep(ids: Iterable<ProjectAbilityId>): ProjectAbilityId | null {
  return sortAbilityIds(ids)[0] ?? null;
}

export type ProjectAbilityCounts = {
  castingRoleCount: number;
  castingCount: number;
  rosterCount: number;
  classSessionCount: number;
};

export type SmartPrimaryAction =
  | { kind: "ability-step"; ability: ProjectAbilityId; label: string }
  | { kind: "add-ability"; label: string };

/** One smart primary CTA for the project home. */
export function resolveSmartPrimaryAction(
  abilities: ProjectAbilityState[],
  counts: ProjectAbilityCounts,
): SmartPrimaryAction {
  if (hasActiveAbility(abilities, "casting") && counts.castingRoleCount === 0) {
    return { kind: "ability-step", ability: "casting", label: PROJECT_ABILITIES.casting.firstStepLabel };
  }
  if (hasActiveAbility(abilities, "roster") && counts.rosterCount === 0) {
    return { kind: "ability-step", ability: "roster", label: PROJECT_ABILITIES.roster.firstStepLabel };
  }
  if (hasActiveAbility(abilities, "classes") && counts.classSessionCount === 0) {
    return { kind: "ability-step", ability: "classes", label: PROJECT_ABILITIES.classes.firstStepLabel };
  }
  return { kind: "add-ability", label: "Ability" };
}

export type AbilityIconDisplay = {
  id: ProjectAbilityId;
  status: ProjectAbilityStatus;
  attention: boolean;
  attentionLabel?: string;
};

export const MAX_VISIBLE_ABILITY_ICONS = 4;

/**
 * Ability icons for projects created before composable shells existed,
 * inferred from the work already attached to the row.
 */
export function deriveLegacyAbilities(input: {
  projectType: string | null | undefined;
  castingCount: number;
  roleCount: number;
  rosterCount: number;
  classSessionCount: number;
}): ProjectAbilityState[] {
  const ids: ProjectAbilityId[] = [];
  if (input.projectType === "casting" || input.castingCount > 0 || input.roleCount > 0) ids.push("casting");
  if (input.rosterCount > 0) ids.push("roster");
  if (input.classSessionCount > 0) ids.push("classes");
  return sortAbilityIds(ids).map((id) => ({ id, status: "active" }));
}

export function formatProjectDateRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  const format = (value: string) => {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const start = startDate ? format(startDate) : null;
  const end = endDate ? format(endDate) : null;
  if (start && end && start !== end) return `${start} – ${end}`;
  return start ?? end ?? null;
}

export function projectShellSubtitle(input: {
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  return [input.location?.trim() || null, formatProjectDateRange(input.startDate, input.endDate)]
    .filter(Boolean)
    .join(" · ");
}

/** Active until the end date passes; then Ended (abilities stop public discovery). */
export function projectShellStatus(endDate: string | null | undefined, now = new Date()): "active" | "ended" {
  if (!endDate) return "active";
  const end = new Date(`${endDate.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return "active";
  return end.getTime() < now.getTime() ? "ended" : "active";
}

export function shouldShowWhatDoYouNeed(input: {
  abilities: ProjectAbilityState[];
  promptDismissedAt: string | null | undefined;
}) {
  return input.abilities.length === 0 && !input.promptDismissedAt;
}

export function shouldShowZeroAbilityBanner(input: {
  abilities: ProjectAbilityState[];
  promptDismissedAt: string | null | undefined;
  createdAt: string | null | undefined;
  now?: Date;
}) {
  if (input.abilities.length > 0 || !input.promptDismissedAt) return false;
  if (!input.createdAt) return true;
  const created = new Date(input.createdAt).getTime();
  if (Number.isNaN(created)) return true;
  const elapsedHours = ((input.now ?? new Date()).getTime() - created) / 36e5;
  return elapsedHours >= ZERO_ABILITY_BANNER_DELAY_HOURS;
}
