import { normalizeProjectContract } from "./project-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { readWorkspaceProjects } from "./project-workspace-read";
import { mapProjectRecordToSummary, projectRecordToComposerForm } from "@/lib/talent-buyers/project-payload";
import { parseProjectModules } from "@/lib/talent-buyers/project-composer-defaults";
import type { ProjectRecord } from "@/types/project";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";
import { cache } from "react";

export async function fetchProjectRecord(projectId: string, posterId: string): Promise<ProjectRecord | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*,project_abilities(ability,settings)")
    .eq("id", projectId)
    .eq("poster_id", posterId)
    .maybeSingle();

  if (error) throw new Error("Could not load this project. Please retry.");
  if (!data) return null;
  return normalizeProjectContract(data) as ProjectRecord;
}

export async function fetchProjectSummary(projectId: string, posterId: string): Promise<BuyerProjectSummary | null> {
  const record = await fetchProjectRecord(projectId, posterId);
  if (!record) return null;
  return mapProjectRecordToSummary(record);
}

export function getProjectModules(record: ProjectRecord) {
  return parseProjectModules(record.enabled_modules);
}

export { projectRecordToComposerForm };

/** Workspace reads allow an explicit project member; mutations keep owner checks. */
export const fetchAccessibleProjectRecord = cache(async (projectId: string, userId: string): Promise<ProjectRecord | null> => {
  const db = await createServerSupabaseClient();
  if (!db) return null;
  const projects = await readWorkspaceProjects(db, createAdminSupabaseClient, userId, projectId);
  return projects.find((project) => project.id === projectId) ?? null;
});
