import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getActiveShell, isOnboardingComplete } from "@/lib/auth/profile";
import { AUTH_RETURN_COOKIE, serializeAuthReturn } from "@/lib/auth/pending-return";
import { normalizeJoinReferralCode } from "@/lib/referrals/code";

export async function GET(request: NextRequest) {
  const code = normalizeJoinReferralCode(request.nextUrl.searchParams.get("code") ?? "");
  const path = `/referrals?code=${encodeURIComponent(code)}`;
  const profile = await getCurrentUserProfile();
  const destination = !profile ? `/signup?next=${encodeURIComponent(path)}` : !isOnboardingComplete(profile) ? getProfileDestination(profile) : getActiveShell(profile) === "lookingForTalent" ? `/dashboard/settings?section=privacy&referral=${encodeURIComponent(code)}` : `/settings?section=resources&referral=${encodeURIComponent(code)}`;
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "no-store");
  if (profile && !isOnboardingComplete(profile)) {
    response.cookies.set(AUTH_RETURN_COOKIE, serializeAuthReturn(profile.id, path), { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}
