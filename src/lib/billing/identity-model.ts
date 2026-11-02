/** Mobile sessions use supabase_user_id; historical web sessions use user_id. */
export function identitySessionOwner(metadata: Record<string, string> | null | undefined): string | null {
  const mobile = metadata?.supabase_user_id?.trim();
  const web = metadata?.user_id?.trim();
  if (mobile && web && mobile !== web) return null;
  return mobile || web || null;
}
export function identitySessionBelongsTo(metadata: Record<string, string> | null | undefined, userId: string) {
  return identitySessionOwner(metadata) === userId;
}
export function shouldApplyIdentitySession(currentSession: string | null, incomingSession: string, currentStatus: string | null, incomingStatus: string) {
  if (currentSession && currentSession !== incomingSession) return false;
  if (currentStatus === "verified" && incomingStatus !== "verified") return false;
  return true;
}
