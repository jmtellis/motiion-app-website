import type { SupabaseClient } from "@supabase/supabase-js";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { normalizeProjectContract } from "./project-contract";
import type { ProjectRecord } from "@/types/project";

/** The same authenticated membership authority used by the iOS project list.
 * Raw projects RLS deliberately hides private castings from non-owners. Never
 * use a caller-supplied project/member ID to authorize privileged hydration.
 */
export async function readWorkspaceProjects(
  session: SupabaseClient,
  getReader: () => SupabaseClient | null,
  userId: string,
  projectId?: string,
): Promise<ProjectRecord[]> {
  const auth = await session.auth.getUser();
  if (auth.error || auth.data.user?.id !== userId) return [];
  const membership = await readPagedRows<{ id: string }>((from, to) => {
    let query = session.rpc("list_my_projects");
    if (projectId) query = query.eq("id", projectId);
    return query.order("id").range(from, to);
  });
  if (membership.error) throw new Error("Could not check access to shared projects. Please retry.");
  const ids = [...new Set((membership.data ?? []).map((row) => row.id))];
  if (!ids.length) return [];
  const reader = getReader();
  if (!reader) throw new Error("Shared projects are temporarily unavailable. Please retry.");
  const projects: ProjectRecord[] = [];
  for (let start = 0; start < ids.length; start += 200) {
    const result = await reader.from("projects").select("*,project_abilities(ability,settings)")
      .in("id", ids.slice(start, start + 200));
    if (result.error) throw new Error("Could not load shared projects. Please retry.");
    projects.push(...(result.data ?? []).map((row) => normalizeProjectContract(row) as ProjectRecord));
  }
  return projects;
}
