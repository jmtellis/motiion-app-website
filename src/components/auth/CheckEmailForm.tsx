"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLink } from "@/components/auth/AuthSplitTransition";
import { buildEmailConfirmationRedirectUrl } from "@/lib/auth/oauth-shared";
import { resendSecondsRemaining, safeAuthReturnPath } from "@/lib/auth/redirects";
import { resolveClientLoginDestination } from "@/lib/auth/login-redirect";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { signOutLocally } from "@/lib/auth/sign-out";

type CheckEmailFormProps = { email: string; accountType?: "talent" | "lookingForTalent"; signedInEmail?: string; returnTo?: string };
export function CheckEmailForm({ email, accountType, signedInEmail, returnTo }: CheckEmailFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [checking, startChecking] = useTransition();
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const differentAccount = Boolean(signedInEmail && signedInEmail.toLowerCase() !== email.toLowerCase());
  const key = `motiion:confirmation-sent:${email.toLowerCase()}`;
  const next = safeAuthReturnPath(returnTo);
  const loginHref = `/login?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  const signupParams = new URLSearchParams();
  if (accountType === "lookingForTalent") signupParams.set("account_type", "lookingForTalent");
  if (next) signupParams.set("next", next);
  const signupHref = `/signup${signupParams.size ? `?${signupParams}` : ""}`;
  useEffect(() => {
    const update = () => {
      try { setRemaining(resendSecondsRemaining(Number(window.localStorage.getItem(key)) || null)); } catch { /* browser storage can be disabled */ }
    };
    update();
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    window.addEventListener("storage", update);
    const db = createClientSupabaseClient();
    const subscription = db?.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user.email_confirmed_at) router.refresh();
    });
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", update); subscription?.data.subscription.unsubscribe(); window.removeEventListener("focus", onFocus); };
  }, [key, router]);
  async function handleResend() {
    if (loading || remaining > 0) return;
    const supabase = createClientSupabaseClient();
    if (!supabase) { setError("Email confirmation is temporarily unavailable. Please try again shortly."); return; }
    setLoading(true); setError(null); setMessage(null);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: buildEmailConfirmationRedirectUrl(accountType, returnTo) } });
      if (resendError) {
        if (resendError.status === 429 || resendError.code === "over_email_send_rate_limit") {
          setError("Please wait a minute before requesting another email.");
        } else { setError("We couldn’t send the email. Check your connection and try again."); return; }
      } else setMessage("A new confirmation email is on its way. Use the newest link and check your spam folder.");
      try { window.localStorage.setItem(key, String(Date.now())); } catch { /* cooldown still applies to this visit */ }
      setRemaining(60);
    } catch { setError("We couldn’t reach the email service. Check your connection and try again."); }
    finally { setLoading(false); }
  }
  function checkConfirmation() {
    setError(null); setMessage(null);
    startChecking(async () => {
      try {
        const db = createClientSupabaseClient();
        const { data } = db ? await db.auth.getUser() : { data: { user: null } };
        if (db && data.user?.email_confirmed_at && data.user.email?.toLowerCase() === email.toLowerCase()) {
          const destination = await resolveClientLoginDestination(db);
          router.replace(destination.includes("onboarding") ? destination : next ?? destination); router.refresh();
        } else setMessage("If you confirmed on another browser or device, log in here to continue. Otherwise, open the newest confirmation email.");
      } catch { setError("Couldn’t check your confirmation. Please try again."); }
    });
  }
  async function switchAccount() {
    setSwitching(true); setError(null);
    try {
      const db = createClientSupabaseClient();
      if (!db) throw new Error("Unavailable");
      await signOutLocally(db.auth, () => window.location.replace(loginHref));
    } catch { setError("Couldn’t switch accounts. Please try again."); }
    finally { setSwitching(false); }
  }
  return <div className="signup-split-form__body">
    <p className="signup-split-form__subtitle" style={{ marginTop: 0, textAlign: "center" }}>Open the confirmation link sent to <strong style={{ overflowWrap: "anywhere" }}>{email}</strong> to continue setting up your account.</p>
    <p className="signup-split-hint" style={{ textAlign: "center" }}>Check your spam folder too. Already opened it on another device? Log in below.</p>
    {differentAccount && <p className="signup-split-hint" role="status">You’re currently signed in as {signedInEmail}. <button type="button" className="signup-split-text-btn signup-split-text-btn--accent" disabled={switching || loading} onClick={() => void switchAccount()}>{switching ? "Switching accounts…" : `Switch to ${email}`}</button></p>}
    {error && <div className="signup-split-error" role="alert">{error}</div>}
    {message && <p className="signup-split-hint" role="status" style={{ textAlign: "center" }}>{message}</p>}
    <button type="button" className="signup-split-submit" disabled={loading || switching || remaining > 0} onClick={() => void handleResend()}>{loading ? "Sending…" : remaining > 0 ? `Resend in ${remaining}s` : "Resend confirmation email"}</button>
    <button type="button" className="signup-split-text-btn w-full" disabled={checking} onClick={checkConfirmation}>{checking ? "Checking…" : "I’ve confirmed my email"}</button>
    <div className="signup-split-alt-auth">
      <p className="signup-split-alt-auth__secondary">Wrong email? <AuthSplitLink href={signupHref} className="signup-split-text-btn signup-split-text-btn--accent">Change email</AuthSplitLink></p>
      <p className="signup-split-alt-auth__secondary">Already confirmed? <AuthSplitLink href={loginHref} className="signup-split-text-btn signup-split-text-btn--accent">Log in</AuthSplitLink></p>
    </div>
  </div>;
}
