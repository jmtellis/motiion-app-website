import { NextResponse, type NextRequest } from "next/server";

import {
  ensureOAuthProfile,
  resolveOAuthRedirectPath,
} from "@/lib/auth/oauth-server";
import { parseOAuthSignupIntent } from "@/lib/auth/oauth-shared";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function resolveRedirectOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const origin = resolveRedirectOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error_description")
    ?? request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("auth_callback_failed")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("auth_callback_missing_code")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("auth_callback_failed")}`,
    );
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.debug("auth callback exchange failed:", exchangeError.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("auth_callback_failed")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("auth_callback_failed")}`,
    );
  }

  const intent = parseOAuthSignupIntent(request.nextUrl.searchParams);

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
    console.debug("auth callback profile setup failed:", error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("profile_setup_failed")}`,
    );
  }

  const destination = await resolveOAuthRedirectPath(supabase, user.id, intent);
  return NextResponse.redirect(`${origin}${destination}`);
}
