import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureOAuthProfile, resolveOAuthRedirectPath } from "@/lib/auth/oauth-server";
import { resolveSignupIntent } from "@/lib/auth/oauth-shared";
import { safeAuthReturnPath } from "@/lib/auth/redirects";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { AUTH_RETURN_COOKIE, serializeAuthReturn } from "@/lib/auth/pending-return";

/** Verify in the originating browser; never place the code in a URL. */
export async function POST(request: NextRequest) {
  const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "Please verify from the Motiion page where you signed up." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Enter your email and verification code." }, 400); }
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const token = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6,10}$/.test(token)) return json({ error: "Enter the code from your email." }, 400);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return json({ error: "Verification is temporarily unavailable. Try again shortly." }, 503);
  try {
    // A prior attempt may have verified successfully before profile setup failed.
    const { data: current } = await supabase.auth.getUser();
    let user = current.user;
    if (!user?.email_confirmed_at || user.email?.toLowerCase() !== email.toLowerCase()) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (error || !data.session) return json({ error: error?.status === 429 ? "Too many attempts. Wait a moment before trying again." : "That code is invalid or expired. Use the newest email or resend a code." }, error?.status === 429 ? 429 : 400);
      user = data.user;
    }
    if (!user || user.email?.toLowerCase() !== email.toLowerCase()) return json({ error: "Couldn’t verify this email. Please try again." }, 400);
    const intent = resolveSignupIntent(new URLSearchParams({ flow: "signup" }), user);
    const { created } = await ensureOAuthProfile(supabase, user, intent);
    if (created) await trackServerEvent("user_signed_up", { account_type: intent.accountType, auth_provider: "email" }, "/auth/verify-code");
    const destination = await resolveOAuthRedirectPath(supabase, user.id, intent, user);
    const requested = safeAuthReturnPath(typeof body.next === "string" ? body.next : null) ?? safeAuthReturnPath(typeof user.user_metadata?.motiion_return_to === "string" ? user.user_metadata.motiion_return_to : null);
    const needsSetup = destination.includes("onboarding");
    const response = json({ destination: requested?.startsWith("/team-invite/") ? requested : needsSetup ? destination : requested ?? destination });
    if (needsSetup && requested) response.cookies.set(AUTH_RETURN_COOKIE, serializeAuthReturn(user.id, requested), { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return json({ error: "Couldn’t finish setting up your account. Try Verify and Continue again." }, 503);
  }
}
