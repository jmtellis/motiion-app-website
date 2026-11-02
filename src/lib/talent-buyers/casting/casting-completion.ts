export function isCastingFullyFinalized(roles: readonly { isCastingFinalized?: boolean }[]): boolean {
  return roles.length > 0 && roles.every((role) => role.isCastingFinalized === true);
}

export function castingOverviewState(input: {
  roles: readonly { isCastingFinalized?: boolean }[];
  status?: string | null;
  visibility?: string | null;
}) {
  if (isCastingFullyFinalized(input.roles)) return {
    label: "Finalized", description: "Selections are locked. Continue with your cast and project coordination.", finalized: true,
  };
  if (input.status === "closed") return { label: "Closed", description: "Submissions are closed. Review your applicants and selections.", finalized: false };
  if (input.status === "paused") return { label: "Paused", description: "Casting is paused. Resume when you are ready for more submissions.", finalized: false };
  if (input.status === "published" || input.status === "open") return {
    label: "Open",
    description: input.visibility === "public" ? "Your public casting is open for submissions." : "Casting is open to talent with access. It is not publicly listed.",
    finalized: false,
  };
  return { label: "Draft", description: "Private until you publish the casting.", finalized: false };
}

export function castingReviewEmptyState(input: { finalized: boolean; reviewedCount: number; shortlistedCount: number }) {
  if (input.finalized) return { title: "Selections finalized", description: "Review is complete. Your selected talent are ready for project coordination.", action: "cast" as const };
  if (input.shortlistedCount > 0) return { title: "All submissions reviewed", description: "Your shortlist is ready for client review and final selection.", action: "cast" as const };
  if (input.reviewedCount > 0) return { title: "Review complete", description: "There are no new submissions to review. View your decisions and final selections in Cast.", action: "cast" as const };
  return { title: "No submissions to review", description: "Invite talent to apply. New submissions will appear here.", action: "invite" as const };
}
