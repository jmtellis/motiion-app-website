export type CastingMemberRole =
  | "owner"
  | "casting_administrator"
  | "collaborator"
  | "reviewer"
  | "viewer"
  | "client_guest";

export type CastingPermission =
  | "view_casting"
  | "edit_breakdown"
  | "publish_casting"
  | "manage_roles"
  | "search_talent"
  | "send_invitations"
  | "manage_casting_link"
  | "add_external_candidates"
  | "review_candidates"
  | "change_candidate_stage"
  | "evaluate_candidates"
  | "send_offers"
  | "confirm_cast"
  | "create_job"
  | "view_internal_notes"
  | "message_talent"
  | "export_data";

const ROLE_PERMISSIONS: Record<CastingMemberRole, CastingPermission[]> = {
  owner: [
    "view_casting",
    "edit_breakdown",
    "publish_casting",
    "manage_roles",
    "search_talent",
    "send_invitations",
    "manage_casting_link",
    "add_external_candidates",
    "review_candidates",
    "change_candidate_stage",
    "evaluate_candidates",
    "send_offers",
    "confirm_cast",
    "create_job",
    "view_internal_notes",
    "message_talent",
    "export_data",
  ],
  casting_administrator: [
    "view_casting",
    "edit_breakdown",
    "publish_casting",
    "manage_roles",
    "search_talent",
    "send_invitations",
    "manage_casting_link",
    "add_external_candidates",
    "review_candidates",
    "change_candidate_stage",
    "evaluate_candidates",
    "send_offers",
    "confirm_cast",
    "create_job",
    "view_internal_notes",
    "message_talent",
    "export_data",
  ],
  collaborator: [
    "view_casting",
    "edit_breakdown",
    "manage_roles",
    "search_talent",
    "send_invitations",
    "add_external_candidates",
    "review_candidates",
    "change_candidate_stage",
    "evaluate_candidates",
    "view_internal_notes",
    "message_talent",
  ],
  reviewer: [
    "view_casting",
    "review_candidates",
    "evaluate_candidates",
    "view_internal_notes",
  ],
  viewer: ["view_casting"],
  client_guest: ["view_casting"],
};

export function normalizeCastingMemberRole(
  value: string | null | undefined,
  isOwner = false,
): CastingMemberRole {
  if (isOwner) return "owner";
  switch (value) {
    case "casting_administrator":
    case "admin":
      return "casting_administrator";
    case "reviewer":
      return "reviewer";
    case "viewer":
    case "client_guest":
      return value === "client_guest" ? "client_guest" : "viewer";
    default:
      return "collaborator";
  }
}

export function hasCastingPermission(
  role: CastingMemberRole,
  permission: CastingPermission,
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canPublishCasting(role: CastingMemberRole): boolean {
  return hasCastingPermission(role, "publish_casting");
}

export function canChangeCandidateStage(role: CastingMemberRole): boolean {
  return hasCastingPermission(role, "change_candidate_stage");
}

export function canSendOffers(role: CastingMemberRole): boolean {
  return hasCastingPermission(role, "send_offers");
}

export function canViewInternalNotes(role: CastingMemberRole): boolean {
  return hasCastingPermission(role, "view_internal_notes");
}
