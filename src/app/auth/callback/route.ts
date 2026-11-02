import { NextResponse, type NextRequest } from "next/server";
import { ensureOAuthProfile, resolveOAuthRedirectPath } from "@/lib/auth/oauth-server";
import { resolveSignupIntent, signupIntentFromUserMetadata } from "@/lib/auth/oauth-shared";
import { AUTH_RETURN_COOKIE, serializeAuthReturn } from "@/lib/auth/pending-return";
import { authCallbackFailurePath, resolveAuthCallbackOrigin, safeAuthReturnPath } from "@/lib/auth/redirects";
import { emailChangeFailurePath } from "@/lib/auth/email-change";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = resolveAuthCallbackOrigin(request.nextUrl.origin, request.headers.get("x-forwarded-host"), process.env.NEXT_PUBLIC_SITE_URL);
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const recovery = params.get("flow") === "recovery" || params.get("type") === "recovery";
  const emailChange = params.get("type") === "email_change";
  const oauth = params.get("provider") === "google" || params.get("provider") === "apple";
  const failure = (code: string) => redirect(authCallbackFailurePath(code, emailChange ? "email_change" : recovery ? "recovery" : oauth ? "oauth" : "signin"));
  const providerError = params.get("error_code") ?? params.get("error");
  if (providerError) return failure(providerError);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return failure("auth_callback_failed");
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  // Token-hash links work on another browser/device without a browser-bound PKCE verifier.
  // They must be enabled in the Supabase email template; OAuth continues to use PKCE.
  const allowedType = type === "signup" || type === "email" || type === "recovery" || type === "invite" || type === "email_change" ? type : null;
  let exchangeError: { code?: string; message: string } | null = null;
  if (tokenHash && allowedType) {
    ({ error: exchangeError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: allowedType }));
  } else if (code) {
    ({ error: exchangeError } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    // Secure email change acknowledges its first link without an auth code.
    // The status page reads the authenticated provider state, never query text.
    if (emailChange) return redirect(emailChangeFailurePath());
    return failure("auth_callback_missing_code");
  }
  if (exchangeError) {
    // Do not silently continue a different account already signed in to this browser.
    // The recovery page names that account and lets the user choose to continue.
    return failure(exchangeError.code ?? "auth_callback_failed");
  }
  if (emailChange) return redirect(emailChangeFailurePath());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failure("auth_callback_failed");
  if (recovery) return redirect("/reset-password");
  let intent = resolveSignupIntent(params, user);
  if (intent.flow === "login") {
    const { data: profile, error } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) return failure("profile_setup_failed");
    const metadataIntent = signupIntentFromUserMetadata(user);
    if (!profile && metadataIntent) intent = { ...intent, ...metadataIntent };
    else if (!profile) {
      // A missing profile is recoverable. Never delete an auth account as a login side effect.
      await supabase.auth.signOut();
      return redirect("/signup?error=no_account");
    }
  }
  try {
    const { created } = await ensureOAuthProfile(supabase, user, intent);
    if (created) await trackServerEvent("user_signed_up", { account_type: intent.accountType, auth_provider: user.app_metadata.provider ?? "email" }, "/auth/callback");
    const destination = await resolveOAuthRedirectPath(supabase, user.id, intent, user);
    const requested = safeAuthReturnPath(params.get("casting_return") ?? params.get("next") ?? (destination.includes("onboarding") && typeof user.user_metadata?.motiion_return_to === "string" ? user.user_metadata.motiion_return_to : null));
    // Complete the essential account setup before following a protected deep link.
    const response = redirect(destination.includes("onboarding") ? destination : requested ?? destination);
    if (requested && destination.includes("onboarding")) response.cookies.set(AUTH_RETURN_COOKIE, serializeAuthReturn(user.id, requested), { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return failure("profile_setup_failed");
  }
}
