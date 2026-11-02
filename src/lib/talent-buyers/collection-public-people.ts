/** Public bearer links never override account privacy, moderation or deletion. */
export function isPublicCollectionAccount(account: { is_private?: boolean | null; moderation_status?: string | null } | null | undefined): boolean {
  return !!account && account.is_private !== true && (account.moderation_status ?? "active") === "active";
}
