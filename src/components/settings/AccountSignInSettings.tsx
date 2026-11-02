"use client";
import { useState, useTransition } from "react";
import { sendTalentPasswordReset, updateTalentEmail } from "@/app/settings/account-actions";
import { EMAIL_CHANGE_INSTRUCTIONS } from "@/lib/auth/email-change";
import Link from "next/link";
import { IndustryField, IndustryInput } from "@/components/talent-buyers/dashboard/IndustryUI";
export function AccountSignInSettings({ email }: { email: string }) {
  const [value, setValue] = useState(email);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  function run(changeEmail: boolean) {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        if (changeEmail) {
          const result = await updateTalentEmail(value);
          if (!result.ok) { setError(result.error); return; }
          setMessage(result.confirmationRequired ? EMAIL_CHANGE_INSTRUCTIONS : "This is already your sign-in email.");
        } else {
          const result = await sendTalentPasswordReset();
          if (!result.ok) { setError(result.error); return; }
          setMessage("Password reset email sent. Open the newest link to choose a password.");
        }
      } catch { setError("Couldn’t update your account. Check your connection and try again."); }
    });
  }
  return <section className="industry-card space-y-4 p-5" aria-labelledby="account-signin-title">
    <div><h3 id="account-signin-title" className="font-semibold">Sign-in & security</h3><p className="mt-1 text-sm text-[var(--ui-muted)]">Your sign-in address is separate from your professional contact email.</p></div>
    <form onSubmit={event => { event.preventDefault(); run(true); }} className="space-y-4">
      <IndustryField label="Sign-in email"><IndustryInput type="email" autoComplete="email" value={value} onChange={event => setValue(event.target.value)} required disabled={pending} /></IndustryField>
      <div className="flex flex-wrap gap-3"><button type="submit" className="bd-btn-secondary" disabled={pending || value.trim() === email}>{pending ? "Please wait…" : "Update sign-in email"}</button><button type="button" className="bd-btn-secondary" disabled={pending} onClick={() => run(false)}>Reset password</button></div>
    </form>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {message && <p role="status" className="text-sm">{message} <Link className="underline" href="/auth/email-change">Check email status</Link></p>}
  </section>;
}
