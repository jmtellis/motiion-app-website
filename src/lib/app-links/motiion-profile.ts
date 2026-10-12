import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

/** Registered iOS custom URL scheme (`CFBundleURLSchemes`) in the Motiion app. */
export const MOTIION_CUSTOM_SCHEME = "motiion";

const DEFAULT_SITE_URL = "https://www.motiion.app";

export function talentProfileSlug(talent: {
  username?: string | null;
  userId?: string | null;
}): string | null {
  const username = talent.username?.trim();
  if (username) return username;
  const userId = talent.userId?.trim();
  return userId ? userId : null;
}

export function profileWebPath(slug: string): string {
  return `/profile/${encodeURIComponent(slug)}`;
}

export function siteOrigin(siteUrl = process.env.NEXT_PUBLIC_SITE_URL): string {
  return (siteUrl?.trim() || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function profileWebUrl(slug: string, siteUrl?: string): string {
  return `${siteOrigin(siteUrl)}${profileWebPath(slug)}`;
}

/**
 * Custom-scheme profile URL that DeepLinkRouter can map onto `/profile/{slug}`.
 *
 * iOS will not honor a Universal Link tapped on the same domain (motiion.app →
 * motiion.app/profile/… stays in Safari). The custom scheme bypasses that.
 *
 * SharedRouting treats the custom-scheme host as the first path component, so
 * `motiion://profile/{slug}` normalizes to the same `/profile/{slug}` route as
 * `https://www.motiion.app/profile/{slug}`.
 */
export function profileAppSchemeUrl(slug: string): string {
  return `${MOTIION_CUSTOM_SCHEME}://profile/${encodeURIComponent(slug)}`;
}

export function isIosUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}

export function profileFallbackUrl(slug: string, userAgent: string, appStoreUrl = getIosAppStoreUrl()): string {
  return isIosUserAgent(userAgent) ? appStoreUrl : profileWebUrl(slug);
}
