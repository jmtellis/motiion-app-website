"use server";

import { normalizeProjectContract } from "@/lib/talent-buyers/project-contract";
import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { ensurePrimaryCastingDraft } from "@/lib/talent-buyers/casting/casting-workflow-data";
import { parseComposableProjectShell } from "@/lib/talent-buyers/composable-project-schema";
import {
  buildComposableConfig,
  isProjectAbilityId,
  parseAbilityModules,
  parseComposableConfig,
  primaryAbilityForNextStep,
  sortAbilityIds,
  type ComposableProjectConfig,
  type ProjectAbilityId,
} from "@/lib/talent-buyers/project-abilities";
import { projectAbilityFirstStepPath, projectHomePath } from "@/lib/talent-buyers/project-routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

type ComposableRow = {
  id: string;
  title: string | null;
  enabled_modules: unknown;
  project_configuration: Record<string, unknown> | null;
  is_composable?: boolean;
  is_active?: boolean;
  project_abilities?: { ability: string }[];
};

export type ComposableActionResult = { ok: true } | { ok: false; error: string };

export type CreateComposableProjectResult =
  | { ok: true; projectId: string; href: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type EnableProjectAbilitiesResult =
  | { ok: true; enabled: ProjectAbilityId[]; nextHref: string | null }
  | { ok: false; error: string };

function nullableTrim(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireSession() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You must be signed in to manage projects." };
  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) return approval;
  return { ok: true as const, supabase, userId: user.id };
}

async function loadOwnedComposableProject(supabase: ServerSupabase, projectId: string, userId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, is_composable, is_active, project_abilities(ability), enabled_modules, project_configuration")
    .eq("id", projectId)
    .eq("poster_id", userId)
    .maybeSingle<ComposableRow>();

  if (error || !data) return null;
  const normalized = normalizeProjectContract(data);
  const composable = parseComposableConfig(normalized.project_configuration);
  if (!composable) return null;
  return { row: normalized, composable };
}

function withComposable(
  projectConfiguration: Record<string, unknown> | null,
  composable: ComposableProjectConfig,
) {
  return { ...(projectConfiguration ?? {}), composable };
}

function revalidateComposable(projectId: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`, "layout");
}

function normalizeAbilityList(values: unknown): ProjectAbilityId[] {
  if (!Array.isArray(values)) return [];
  return sortAbilityIds(values.filter(isProjectAbilityId));
}

/** Thin create: name plus optional city/dates/cover. No type, no abilities. */
export async function createComposableProject(payload: unknown): Promise<CreateComposableProjectResult> {
  const parsed = parseComposableProjectShell(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your project details.",
      fieldErrors,
    };
  }

  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase } = session;
  const shell = parsed.data;

  const { data, error } = await supabase.rpc("create_project_shell", {
    p_title: shell.name, p_location: nullableTrim(shell.location),
    p_start_date: nullableTrim(shell.startDate), p_end_date: nullableTrim(shell.endDate),
    p_request_id: shell.requestId ?? null,
  });
  if (error || typeof data !== "string") return { ok: false, error: error?.message ?? "Couldn't create the project." };
  const projectId = data;
  await trackServerEvent("project_created", {
    project_id: projectId,
    composable: true,
    has_city: Boolean(nullableTrim(shell.location)),
    has_dates: Boolean(nullableTrim(shell.startDate) || nullableTrim(shell.endDate)),
  });

  revalidateComposable(projectId);
  return { ok: true, projectId, href: projectHomePath(projectId) };
}

/**
 * Turn on one or more abilities. Returns the single combined next step
 * (Casting > Roster > Classes) for the newly enabled set.
 */
export async function enableProjectAbilities(input: {
  projectId: string;
  abilities: ProjectAbilityId[];
}): Promise<EnableProjectAbilitiesResult> {
  const abilities = normalizeAbilityList(input.abilities);
  if (!abilities.length) return { ok: false, error: "Pick at least one ability." };

  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase, userId } = session;

  const project = await loadOwnedComposableProject(supabase, input.projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };

  const rawModules =
    project.row.enabled_modules && typeof project.row.enabled_modules === "object"
      ? (project.row.enabled_modules as Record<string, unknown>)
      : {};
  const current = parseAbilityModules(rawModules);
  const newlyEnabled = abilities.filter((id) => !current[id]);
  const nextModules: Record<string, unknown> = { ...rawModules, ...current };
  for (const id of abilities) nextModules[id] = true;

  const composable = buildComposableConfig(project.composable, {
    paused: project.composable.paused.filter((id) => !abilities.includes(id)),
  });

  const enabled = await supabase.rpc("enable_project_abilities", { p_project_id: input.projectId, p_abilities: abilities });
  if (enabled.error) return { ok: false, error: enabled.error.message };
  const { error } = await supabase
    .from("projects")
    .update({
      is_composable: true,
      enabled_modules: nextModules,
      project_configuration: withComposable(project.row.project_configuration, composable),
    })
    .eq("id", input.projectId)
    .eq("poster_id", userId);

  if (error) return { ok: false, error: error.message };

  if (abilities.includes("casting")) {
    const castingId = await ensurePrimaryCastingDraft(input.projectId, userId, project.row.title ?? "");
    if (!castingId) return { ok: false, error: "Casting was enabled but its workspace could not be prepared. Please retry." };
  }

  for (const ability of newlyEnabled) {
    await trackServerEvent("project_ability_enabled", { project_id: input.projectId, ability });
  }

  revalidateComposable(input.projectId);
  const next = primaryAbilityForNextStep(newlyEnabled.length ? newlyEnabled : abilities);
  return {
    ok: true,
    enabled: abilities,
    nextHref: next ? projectAbilityFirstStepPath(input.projectId, next) : null,
  };
}

/** Pause keeps the ability's data but dims it and hides it from the smart CTA. */
export async function setProjectAbilityPaused(input: {
  projectId: string;
  ability: ProjectAbilityId;
  paused: boolean;
}): Promise<ComposableActionResult> {
  if (!isProjectAbilityId(input.ability)) return { ok: false, error: "Unknown ability." };

  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase, userId } = session;

  const project = await loadOwnedComposableProject(supabase, input.projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };
  if (!parseAbilityModules(project.row.enabled_modules)[input.ability]) {
    return { ok: false, error: "That ability isn't on this project yet." };
  }

  const paused = new Set(project.composable.paused);
  if (input.paused) paused.add(input.ability);
  else paused.delete(input.ability);

  const abilityResult = input.paused
    ? await supabase.rpc("disable_project_ability", { p_project_id: input.projectId, p_ability: input.ability })
    : await supabase.rpc("enable_project_abilities", { p_project_id: input.projectId, p_abilities: [input.ability] });
  if (abilityResult.error) return { ok: false, error: abilityResult.error.message };
  const composable = buildComposableConfig(project.composable, { paused: [...paused] });
  const { error } = await supabase
    .from("projects")
    .update({ project_configuration: withComposable(project.row.project_configuration, composable) })
    .eq("id", input.projectId)
    .eq("poster_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidateComposable(input.projectId);
  return { ok: true };
}

export async function dismissProjectAbilityPrompt(projectId: string): Promise<ComposableActionResult> {
  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase, userId } = session;

  const project = await loadOwnedComposableProject(supabase, projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };

  const composable = buildComposableConfig(project.composable, {
    prompt_dismissed_at: new Date().toISOString(),
  });
  const { error } = await supabase
    .from("projects")
    .update({ project_configuration: withComposable(project.row.project_configuration, composable) })
    .eq("id", projectId)
    .eq("poster_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidateComposable(projectId);
  return { ok: true };
}

export async function updateComposableProjectShell(input: {
  projectId: string;
  shell: unknown;
}): Promise<CreateComposableProjectResult> {
  const parsed = parseComposableProjectShell(input.shell);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your project details." };
  }

  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase, userId } = session;

  const project = await loadOwnedComposableProject(supabase, input.projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };

  const shell = parsed.data;
  const updated = await supabase.rpc("update_project_shell", { p_project_id: input.projectId, p_title: shell.name, p_location: nullableTrim(shell.location), p_start_date: nullableTrim(shell.startDate), p_end_date: nullableTrim(shell.endDate) });
  if (updated.error) return { ok: false, error: updated.error.message };
  const { error } = await supabase.from("projects").update({ cover_image_url: nullableTrim(shell.coverImageUrl) }).eq("id", input.projectId).eq("poster_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidateComposable(input.projectId);
  return { ok: true, projectId: input.projectId, href: projectHomePath(input.projectId) };
}

/** Archive hides the project from the active list; abilities keep their data. */
export async function setComposableProjectArchived(input: {
  projectId: string;
  archived: boolean;
}): Promise<ComposableActionResult> {
  const session = await requireSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { supabase, userId } = session;

  const project = await loadOwnedComposableProject(supabase, input.projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };

  const composable = buildComposableConfig(project.composable, {
    archived_at: input.archived ? new Date().toISOString() : null,
  });
  const { error } = await supabase
    .from("projects")
    .update({ is_active: !input.archived, project_configuration: withComposable(project.row.project_configuration, composable) })
    .eq("id", input.projectId)
    .eq("poster_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidateComposable(input.projectId);
  return { ok: true };
}

/** Notes use the same ability settings as the current iOS project home. */
export async function saveProjectNotes(projectId: string, body: string): Promise<ComposableActionResult> {
  if (typeof body !== "string" || body.length > 50000) return { ok: false, error: "Keep project notes under 50,000 characters." };
  const session = await requireSession();
  if (!session.ok) return session;
  const project = await loadOwnedComposableProject(session.supabase, projectId, session.userId);
  if (!project) return { ok: false, error: "Only the project owner can edit notes." };
  const enabled = await session.supabase.rpc("enable_project_abilities", { p_project_id: projectId, p_abilities: ["notes"] });
  if (enabled.error) return { ok: false, error: "Could not prepare project notes. Please try again." };
  const result = await session.supabase.rpc("update_project_ability_settings", { p_project_id: projectId, p_ability: "notes", p_settings: { body } });
  if (result.error) return { ok: false, error: "Could not save notes. Your changes are still here." };
  revalidateComposable(projectId); return { ok: true };
}
