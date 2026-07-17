import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProjectRecordToSummary, projectRecordToComposerForm } from "@/lib/talent-buyers/project-payload";
import { parseProjectModules } from "@/lib/talent-buyers/project-composer-defaults";
import type { ProjectRecord } from "@/types/project";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

export async function fetchProjectRecord(projectId: string, posterId: string): Promise<ProjectRecord | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("poster_id", posterId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProjectRecord;
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
