import type { CastingProject, CastingRole } from "./casting-types";

export function castingShareState(casting: Pick<CastingProject, "status" | "visibility"> | null | undefined, roles: Pick<CastingRole, "bridgedRoleId">[]) {
  const invitationOnly = casting?.visibility === "private" || casting?.visibility === "invitation_only";
  const roleId = roles.find((role) => role.bridgedRoleId)?.bridgedRoleId;
  const path = casting?.status === "published" && !invitationOnly && (casting.visibility === "public" || casting.visibility === "unlisted") && roleId
    ? `/casting/${encodeURIComponent(roleId)}` : null;
  return { path, invitationOnly, description: path
    ? "Anyone with this link can view the casting and its application instructions."
    : invitationOnly ? "This casting is invitation-only. Invite talent from Motiion to give them access."
      : "Add roles and publish a public or unlisted casting before sharing its application link." };
}
