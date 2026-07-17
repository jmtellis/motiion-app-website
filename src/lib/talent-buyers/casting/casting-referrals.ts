import type { CastingReferral } from "./casting-types";
import type { Talent } from "@/lib/talent-navigator/types";
import { getProfileInitials } from "@/lib/auth/avatar";

function headshotPlaceholderDataUrl(name: string): string {
  const initials = getProfileInitials(name || "?");
  const hue =
    Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533" viewBox="0 0 400 533"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},35%,28%)"/><stop offset="100%" style="stop-color:hsl(${hue},45%,18%)"/></linearGradient></defs><rect width="400" height="533" fill="url(#g)"/><text x="200" y="280" text-anchor="middle" font-family="system-ui,sans-serif" font-size="96" font-weight="600" fill="rgba(255,255,255,0.35)">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function referralToTalent(referral: CastingReferral): Talent {
  const name = referral.talentName || "Talent";
  const referrerLabel = referral.referrerDisplayName?.trim();
  return {
    id: referral.talentUserId ?? referral.referredProfileId,
    slug: referral.talentSlug ?? referral.referredProfileId,
    name,
    imageUrl: referral.headshotUrl?.trim() || headshotPlaceholderDataUrl(name),
    location: referral.location,
    styles: referral.styles ?? [],
    represented: false,
    isVerified: false,
    caption: referrerLabel ? `By ${referrerLabel}` : undefined,
  };
}
