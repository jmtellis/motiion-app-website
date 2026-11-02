export type ProjectScope = "active" | "draft" | "archived";

/** Old All/Browse/Focus links open the current Active workspace. */
export function projectScope(value: string | null | undefined): ProjectScope {
  if (value === "draft" || value === "drafts") return "draft";
  return value === "archived" ? "archived" : "active";
}

type FilterableProject = {
  id: string;
  title: string;
  status: string;
  projectType: string;
  workKind?: string;
  workTypeLabel?: string;
  lastUpdated: string;
  abilities?: { id: string }[];
};

export function filterProjects<T extends FilterableProject>(
  projects: T[],
  { scope, type = "all", query = "" }: { scope: ProjectScope; type?: string; query?: string },
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return projects
    .filter((project) => project.status === scope)
    .filter((project) => type === "all" || (type === "casting"
      ? (project.projectType === "casting" || project.abilities?.some((ability) => ability.id === "casting")) && project.workKind !== "activity"
      : (project.workTypeLabel ?? project.projectType).toLowerCase() === type || (type === "class" && project.abilities?.some((ability) => ability.id === "classes"))))
    .filter((project) => `${project.title} ${project.workTypeLabel ?? project.projectType}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => {
      const dateDifference = (Date.parse(b.lastUpdated) || 0) - (Date.parse(a.lastUpdated) || 0);
      return dateDifference || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
}

export function projectHubQuery(params: URLSearchParams, scope: ProjectScope): string {
  const next = new URLSearchParams(params);
  // These preferences no longer represent a different product view.
  for (const key of ["view", "viewMode", "mode", "layout", "scope"]) next.delete(key);
  if (scope !== "active") next.set("scope", scope);
  return next.toString();
}
