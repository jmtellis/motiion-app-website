export const PENDING_FEATURED_TALENT_INVITE_TOKEN_KEY =
  "motiion.pending_featured_talent_invite_token";

export type FeaturedTalentInviteCard = {
  inviteId: string;
  activityId: string;
  parentId: string | null;
  displayName: string;
  eventTitle: string;
  coverImageUrl: string | null;
  inviterName: string | null;
  token: string;
  expiresAt: string | null;
};

export function normalizeFeaturedTalentInviteToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

export function readPendingFeaturedTalentInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(PENDING_FEATURED_TALENT_INVITE_TOKEN_KEY);
    if (!value) return null;
    const normalized = normalizeFeaturedTalentInviteToken(value);
    return normalized || null;
  } catch {
    return null;
  }
}

export function storePendingFeaturedTalentInviteToken(token: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeFeaturedTalentInviteToken(token);
  if (!normalized) return;
  try {
    window.localStorage.setItem(PENDING_FEATURED_TALENT_INVITE_TOKEN_KEY, normalized);
  } catch {
    // ignore
  }
}

export function clearPendingFeaturedTalentInviteToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_FEATURED_TALENT_INVITE_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function featuredInvitePath(token: string): string {
  return `/featured-invite/${encodeURIComponent(normalizeFeaturedTalentInviteToken(token) || token)}`;
}
