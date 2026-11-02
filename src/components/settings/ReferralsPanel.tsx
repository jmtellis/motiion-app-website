"use client";

import { useState } from "react";
import { claimReferral } from "@/app/settings/referral-actions";
import { joinPageUrl, normalizeJoinReferralCode } from "@/lib/referrals/code";

export function ReferralsPanel({ username, accountId, initialCode = "" }: { username?: string | null; accountId: string; initialCode?: string }) {
  const link = joinPageUrl(normalizeJoinReferralCode(username || accountId));
  const [code, setCode] = useState(initialCode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function share() {
    setError(null); setMessage(null);
    try {
      if (navigator.share) await navigator.share({ title: "Join me on Motiion", url: link });
      else { await navigator.clipboard.writeText(link); setMessage("Referral link copied."); }
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError")) setError("Couldn’t share the link. Select and copy the address below.");
    }
  }
  async function claim(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    try { const result = await claimReferral(code); if (result.ok) setMessage(result.message); else setError(result.error); }
    catch { setError("Couldn’t confirm your referral. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]" aria-labelledby="referrals-title">
    <h2 id="referrals-title" className="text-lg font-semibold">Invite your people</h2>
    <p className="text-sm text-[var(--ui-muted)]">Share your personal link so friends can join you on Motiion.</p>
    <p className="select-all break-all text-sm">{link}</p>
    <button type="button" className="ui-button ui-button--secondary" onClick={share}>Share invite link</button>
    <form onSubmit={claim} className="space-y-3 border-t border-[var(--ui-border)] pt-4">
      <label className="ui-field"><span className="ui-field__label">Who invited you?</span><span className="ui-field__hint">Optional. Confirm a friend’s username or code within 48 hours of signing up.</span><input autoComplete="off" maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} disabled={pending} /></label>
      <button type="submit" className="ui-button" disabled={pending || !code.trim()}>{pending ? "Confirming…" : "Confirm referral"}</button>
    </form>
    {error ? <p className="ui-notice" data-tone="error" role="alert">{error}</p> : null}
    {message ? <p className="ui-notice" data-tone="success" role="status">{message}</p> : null}
  </section>;
}
