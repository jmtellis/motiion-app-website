import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { AUTH_RETURN_COOKIE, serializeAuthReturn } from "@/lib/auth/pending-return";
import { safeAuthReturnPath } from "@/lib/auth/redirects";

/** Preserve a new deep link when an already signed-in account still needs setup. */
export async function GET(request: NextRequest) {
  const requested = safeAuthReturnPath(request.nextUrl.searchParams.get("next"));
  const profile = await getCurrentUserProfile();
  const complete = profile && isOnboardingComplete(profile);
  const destination = profile
    ? complete ? requested ?? getProfileDestination(profile) : getProfileDestination(profile)
    : `/login${requested ? `?next=${encodeURIComponent(requested)}` : ""}`;
  const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  if (profile && !complete && requested) {
    response.cookies.set(AUTH_RETURN_COOKIE, serializeAuthReturn(profile.id, requested), {
      httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
