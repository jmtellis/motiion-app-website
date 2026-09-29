export const PROJECTS_CREATE_QUERY = "create";
/** Legacy `?create=activity` links (old standalone picker) now open thin project create. */
export const PROJECTS_CREATE_ACTIVITY_VALUE = "activity";
/** `&intent=casting` pre-selects Casting on the new project's home. */
export const PROJECTS_CREATE_INTENT_QUERY = "intent";

/** Thin project create (name first, abilities after). */
export function projectsCreateHref(intent?: "casting" | null) {
  const params = new URLSearchParams({ [PROJECTS_CREATE_QUERY]: "1" });
  if (intent) params.set(PROJECTS_CREATE_INTENT_QUERY, intent);
  return `/projects?${params.toString()}`;
}
