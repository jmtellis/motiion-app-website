import { NextResponse, type NextRequest } from "next/server";

import {
  ensureOAuthProfile,
  resolveOAuthRedirectPath,
} from "@/lib/auth/oauth-server";
import { parseOAuthSignupIntent } from "@/lib/auth/oauth-shared";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isLocalhostOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin);
  }
}

function resolveRedirectOrigin(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin.replace(/\/$/, "");

  // Local OAuth callbacks must stay on localhost even when NEXT_PUBLIC_SITE_URL
  // (or a proxy header) points at production.
  if (isLocalhostOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  return requestOrigin;
}

function resolveAuthErrorPath(intent: ReturnType<typeof parseOAuthSignupIntent>) {
  if (intent.flow !== "signup") return "/login";
  return intent.accountType === "lookingForTalent" ? "/talent-buyers/signup" : "/signup";
}

function redirectWithAuthError(
  origin: string,
  path: string,
  code: string,
) {
  return NextResponse.redirect(`${origin}${path}?error=${encodeURIComponent(code)}`);
}

async function rejectLoginWithoutProfile(options: {
  origin: string;
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
  userId: string;
}) {
  const { origin, supabase, userId } = options;

  // Remove the orphaned auth identity created by the provider exchange so we
  // do not leave a Motiion-less account hanging around.
  const admin = createAdminSupabaseClient();
  if (admin) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("auth callback orphan delete failed:", deleteError.message);
    }
  }

  await supabase.auth.signOut();
  return redirectWithAuthError(origin, "/talent-buyers/signup", "no_account");
}

export async function GET(request: NextRequest) {
  const origin = resolveRedirectOrigin(request);
  const intent = parseOAuthSignupIntent(request.nextUrl.searchParams);
  const errorPath = resolveAuthErrorPath(intent);
  const code = request.nextUrl.searchParams.get("code");
  const oauthError =
    request.nextUrl.searchParams.get("error_description")
    ?? request.nextUrl.searchParams.get("error");

  if (oauthError) {
    console.error("auth callback provider error:", oauthError);
    return redirectWithAuthError(origin, errorPath, "auth_callback_failed");
  }

  if (!code) {
    return redirectWithAuthError(origin, errorPath, "auth_callback_missing_code");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return redirectWithAuthError(origin, errorPath, "auth_callback_failed");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth callback exchange failed:", exchangeError.message);
    return redirectWithAuthError(origin, errorPath, "auth_callback_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithAuthError(origin, errorPath, "auth_callback_failed");
  }

  if (intent.flow === "login") {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      return rejectLoginWithoutProfile({
        origin,
        supabase,
        userId: user.id,
      });
    }
  }

  try {
    const { created } = await ensureOAuthProfile(supabase, user, intent);
    if (created && intent.flow === "signup") {
      await trackServerEvent(
        "user_signed_up",
        {
          account_type: intent.accountType,
          auth_provider: user.app_metadata.provider ?? "oauth",
        },
        "/auth/callback",
      );
    }
  } catch (error) {
    console.error("auth callback profile setup failed:", error);
    return redirectWithAuthError(origin, errorPath, "profile_setup_failed");
  }

  const destination = await resolveOAuthRedirectPath(supabase, user.id, intent);
  return NextResponse.redirect(`${origin}${destination}`);
}
