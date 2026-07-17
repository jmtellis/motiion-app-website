export const PROJECTS_CREATE_QUERY = "create";

export function projectsCreateHref() {
  return `/projects?${PROJECTS_CREATE_QUERY}=1`;
}
