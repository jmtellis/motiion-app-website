import type { CastingRole } from "./casting-types";
import { castingWorkspaceHref } from "./casting-routes";
export function findWorkspaceRole(roles: CastingRole[], id: string | null) {
  return id ? roles.find((role) => [role.id, role.bridgedRoleId, ...(role.bridgedRoleIds ?? [])].includes(id)) : undefined;
}
export function roleWorkspaceHref(projectId: string, roleId: string, view: "review" | "shortlist" | "cast" | "talent-search" | "client-review") {
  return castingWorkspaceHref(projectId, view === "shortlist" ? "review" : view, { roleId, ...(view === "shortlist" ? { stage: "shortlisted" as const } : {}) });
}
