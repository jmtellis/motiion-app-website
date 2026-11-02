"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { buildEmailConfirmationRedirectUrl, resolveBrowserOrigin } from "@/lib/auth/oauth-shared";
import { resolveClientLoginDestination } from "@/lib/auth/login-redirect";
import { CheckEmailForm } from "./CheckEmailForm";

export function EmailLinkRecoveryForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(null); setBusy(true);
    try {
      const db = createClientSupabaseClient();
      if (!db) { setError("Email confirmation is temporarily unavailable. Try again shortly."); return; }
      const { error } = await db.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: buildEmailConfirmationRedirectUrl() } });
      if (error) { setError(error.status === 429 ? "Please wait a minute before requesting another email." : "Couldn’t send the email. Check your address and try again."); return; }
      try { window.localStorage.setItem(`motiion:confirmation-sent:${email.trim().toLowerCase()}`, String(Date.now())); } catch { /* storage is optional */ }
      setSubmitted(true);
    } catch { setError("Couldn’t reach Motiion. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  if (submitted) return <CheckEmailForm email={email.trim()} />;
  return <form className="signup-split-form__body flex flex-col gap-4" onSubmit={event => void submit(event)}>
    <label className="signup-split-field"><span>Email address</span><input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
    {error && <p className="signup-split-error" role="alert">{error}</p>}
    <button className="signup-split-submit" disabled={busy}>{busy ? "Sending…" : "Request a new confirmation"}</button>
    <Link href="/login" className="signup-split-text-btn text-center">Log in to a confirmed account</Link>
  </form>;
}

export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (pending) return;
    setError(null);
    if (reset && (password.length < 8 || password !== confirm)) { setError("Use at least 8 characters and enter the same password twice."); return; }
    const db = createClientSupabaseClient();
    if (!db) { setError("Account recovery is temporarily unavailable. Please try again shortly."); return; }
    setPending(true);
    try {
      if (reset) {
        const { data: { user } } = await db.auth.getUser();
        if (!user) { setError("Your reset link has expired. Request a new one below."); return; }
        const { error } = await db.auth.updateUser({ password });
        if (error) { setError(error.message); return; }
        setSent(true);
        router.replace(await resolveClientLoginDestination(db)); router.refresh();
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${resolveBrowserOrigin()}/auth/callback?flow=recovery` });
        if (error) { setError(error.status === 429 ? "Please wait a minute before requesting another reset email." : "Couldn’t send the reset email. Please try again."); return; }
        setSent(true);
      }
    } catch { setError("We couldn’t reach Motiion. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={event => void submit(event)} className="signup-split-form__body flex flex-col gap-4">
    {!reset && !sent && <label className="signup-split-field"><span>Email address</span><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>}
    {reset && <>
      <label className="signup-split-field"><span>New password</span><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="signup-split-field"><span>Confirm new password</span><input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>
    </>}
    {error && <p className="signup-split-error" role="alert">{error}</p>}
    {sent && <p role="status" className="signup-split-hint">{reset ? "Password saved. Opening your account…" : `If an account uses ${email.trim()}, we’ve sent a password reset link. Check your inbox and spam folder. Open the newest link to choose a new password.`}</p>}
    {!sent && <button disabled={pending} className="signup-split-submit">{pending ? "Please wait…" : reset ? "Save new password" : "Send reset link"}</button>}
    {reset && <Link href="/forgot-password" className="signup-split-text-btn text-center">Request another reset link</Link>}
    <Link href="/login" className="signup-split-text-btn text-center">Back to log in</Link>
  </form>;
}
