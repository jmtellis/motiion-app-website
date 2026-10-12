import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

/** Registered iOS custom URL scheme (`CFBundleURLSchemes`) in the Motiion app. */
export const MOTIION_CUSTOM_SCHEME = "motiion";

/** Web host DeepLinkRouter accepts when the URL arrives via the custom scheme. */
export const MOTIION_APP_SCHEME_HOST = "www.motiion.app";

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
 * Custom-scheme profile URL for the shipped iOS DeepLinkRouter.
 *
 * iOS will not honor a Universal Link tapped on the same domain (motiion.app →
 * motiion.app/profile/… stays in Safari). The custom scheme `motiion` is
 * registered and opens the app.
 *
 * Foundation parses `motiion://profile/{slug}` as host=`profile` with an empty
 * path. DeepLinkRouter only accepts Motiion web hosts (`motiion.app` /
 * `www.motiion.app`), so that form opens the app but does not land on the
 * profile. Including the web host makes host=`www.motiion.app` and
 * path=`/profile/{slug}`, which the router maps to the talent profile
 * (username or UUID).
 */
export function profileAppSchemeUrl(slug: string): string {
  return `${MOTIION_CUSTOM_SCHEME}://${MOTIION_APP_SCHEME_HOST}${profileWebPath(slug)}`;
}

export function isIosUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}

export function profileFallbackUrl(slug: string, userAgent: string, appStoreUrl = getIosAppStoreUrl()): string {
  return isIosUserAgent(userAgent) ? appStoreUrl : profileWebUrl(slug);
}
