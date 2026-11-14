import { projectHomePath, projectPath, projectWorkspacePath } from "./project-routes";

/** Mirrors the app: one project workspace, with focused Manage drill-ins. */
export function projectWorkspaceSection(pathname: string, projectId: string) {
  if (pathname === projectPath(projectId, "timeline")) return "schedule";
  if (pathname === projectPath(projectId, "messages")) return "messages";
  return "manage";
}

export const CASTING_VIEWS = [
  { id: "breakdown", label: "Details & roles" },
  { id: "talent-search", label: "Invite talent" },
  { id: "review", label: "Review submissions" },
  { id: "client-review", label: "Shortlist & feedback" },
  { id: "cast", label: "Selections" },
] as const;

export function projectDrillIn(pathname: string, projectId: string) {
  if (pathname.startsWith(projectPath(projectId, "workspace") + "/")) return "Casting";
  if (pathname === projectPath(projectId, "roster")) return "People";
  if (pathname === projectPath(projectId, "coordination") || pathname === projectPath(projectId, "bookings")) return "Confirmations";
  if (pathname === projectPath(projectId, "files")) return "Files";
  if (pathname === projectPath(projectId, "classes")) return "Classes";
  return null;
}

export function projectWorkspaceSections(projectId: string) {
  return [
    { id: "manage", label: "Manage", href: projectHomePath(projectId) },
    { id: "schedule", label: "Schedule", href: projectPath(projectId, "timeline") },
    { id: "messages", label: "Messages", href: projectPath(projectId, "messages") },
  ];
}

export function castingViewHref(projectId: string, value: string) {
  const view = CASTING_VIEWS.find(({ id }) => id === value);
  return view ? projectWorkspacePath(projectId, view.id) : null;
}

export function projectConversations<T extends { context_type: string | null; context_id: string | null }>(
  conversations: T[], projectId: string, castingIds: string[], activityIds: string[],
): T[] {
  const castings = new Set(castingIds);
  const activities = new Set(activityIds);
  return conversations.filter(({ context_type: type, context_id: id }) => Boolean(id && (
    (type === "project" && id === projectId) ||
    (type === "casting" && castings.has(id)) ||
    (["activity", "event", "class", "session"].includes(type ?? "") && activities.has(id))
  )));
}
