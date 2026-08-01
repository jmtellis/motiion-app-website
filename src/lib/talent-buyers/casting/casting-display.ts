import type { CastingProjectStatus, CastingVisibility } from "./casting-types";

/** DB `castings.status` values that allow invites and referrals. */
export function castingAcceptsOutreach(status: string | null | undefined): boolean {
  return status === "open" || status === "published";
}

/** UI-mapped casting status that allows invites and referrals. */
export function castingProjectAcceptsOutreach(
  status: CastingProjectStatus | "none" | null | undefined,
): boolean {
  return status === "published";
}

export function isCastingPublicVisibility(visibility: CastingVisibility | undefined): boolean {
  return visibility === "public";
}

export function castingVisibilityLabel(visibility: CastingVisibility | undefined): string {
  return isCastingPublicVisibility(visibility) ? "Public" : "Private";
}

export function castingVisibilityHint(visibility: CastingVisibility | undefined): string {
  switch (visibility) {
    case "public":
      return "Open call — talent can discover and submit.";
    case "private":
      return "Private — talent can only submit when invited.";
    case "invitation_only":
      return "Private — talent can only submit when invited.";
    default:
      return "Private — not published yet.";
  }
}
