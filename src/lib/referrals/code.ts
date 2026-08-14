import { PROFILE_SLUG_UUID_RE } from "@/lib/profileOg";

/** Matches iOS `DeepLinkRouter.normalizeJoinReferralCode`. */
export function normalizeJoinReferralCode(raw: string): string {
  let code = decodeURIComponent(raw).trim().toLowerCase();
  if (code.startsWith("@")) {
    code = code.replace(/^@+/u, "");
  }
  if (PROFILE_SLUG_UUID_RE.test(code)) {
    return code;
  }
  return code.replace(/[^a-z0-9_]/gu, "");
}

export function joinPagePath(code: string): string {
  return `/join/${encodeURIComponent(code)}`;
}

export function joinPageUrl(code: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  return `${siteUrl}${joinPagePath(code)}`;
}
