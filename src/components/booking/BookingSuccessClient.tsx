"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { activityPaymentState } from "@/lib/app/activity-enrollment";
import { callSupabaseFunction, callSupabaseFunctionAsUser } from "@/lib/supabaseRest";
import { readGuestReceipt } from "@/lib/app/guest-receipt";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { PublicActivityKind } from "@/types/public";

type CheckoutStatus = {
  status: string;
  activityId?: string;
  activityTitle?: string | null;
  activityKind?: PublicActivityKind;
  sessionId: string;
  receiptOnly?: boolean;
};

export type BookingSuccessProps = {
  stripeSessionId: string | null;
  activityId: string | null;
  kind: PublicActivityKind | null;
  verifiedEnrollment: boolean;
  signedIn: boolean;
};

export function BookingSuccessClient(props: BookingSuccessProps) {
  return <BookingSuccessState key={`${props.stripeSessionId ?? props.activityId}:${props.signedIn}`} {...props} />;
}

function BookingSuccessState({ stripeSessionId, activityId, kind, verifiedEnrollment, signedIn }: BookingSuccessProps) {
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(stripeSessionId));
  const [guestReceiptAvailable, setGuestReceiptAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const paymentState = activityPaymentState(status?.status);
  const confirmed = stripeSessionId ? paymentState === "confirmed" : verifiedEnrollment;
  const resolvedKind = status?.activityKind ?? kind ?? "class";
  const resolvedActivityId = status?.activityId ?? activityId;
  const backHref = resolvedActivityId ? `/activity/${encodeURIComponent(resolvedActivityId)}` : null;

  const returnQuery = new URLSearchParams();
  if (stripeSessionId) returnQuery.set("session_id", stripeSessionId);
  if (activityId) returnQuery.set("activity_id", activityId);
  if (kind) returnQuery.set("kind", kind);
  const signInHref = `/login?next=${encodeURIComponent(`/payments/success?${returnQuery}`)}`;

  useEffect(() => {
    if (!stripeSessionId) return;
    const currentSessionId = stripeSessionId;
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        let data: CheckoutStatus;
        if (signedIn) {
          const client = createClientSupabaseClient();
          if (!client) throw new Error("Payment confirmation is unavailable. Please try again later.");
          const { data: auth, error: authError } = await client.auth.getSession();
          if (authError || !auth.session?.access_token) throw new Error("Sign in to the account used for this reservation, then check again.");
          data = await callSupabaseFunctionAsUser<CheckoutStatus>("web-checkout-status", { sessionId: stripeSessionId }, auth.session.access_token);
        } else {
          const receiptToken = readGuestReceipt(currentSessionId);
          if (!receiptToken) { if (!cancelled) setLoading(false); return; }
          if (!cancelled) setGuestReceiptAvailable(true);
          data = await callSupabaseFunction<CheckoutStatus>("web-checkout-status", { sessionId: stripeSessionId, receiptToken });
        }
        if (cancelled) return;
        if (data.sessionId !== stripeSessionId || typeof data.status !== "string" || (data.receiptOnly !== true && typeof data.activityId !== "string")) {
          throw new Error("The payment service returned an incomplete confirmation.");
        }
        setStatus(data);
        setError(null);
        const state = activityPaymentState(data.status);
        if (state === "confirmed" || state === "failed") { setLoading(false); return; }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to confirm payment.");
      }
      if (++tries < 10 && !cancelled) timer = setTimeout(poll, 1500);
      else if (!cancelled) setLoading(false);
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [stripeSessionId, attempt, signedIn]);

  const needsSignIn = !signedIn && !guestReceiptAvailable && !loading;
  const headline = needsSignIn && stripeSessionId ? "Sign in to confirm your reservation" : loading ? "Confirming your reservation…"
    : confirmed ? (stripeSessionId ? "Payment confirmed" : "You're registered")
      : paymentState === "failed" ? "Reservation not completed" : "Confirmation pending";
  const summary = needsSignIn && stripeSessionId ? "Sign in to the Motiion account used for this reservation to view its payment and registration status. Your Stripe receipt remains your payment record." : loading ? "We're checking your payment and registration. This usually takes a few seconds."
    : confirmed ? status?.receiptOnly ? "Your payment and registration are confirmed. Keep your Stripe receipt. Sign in to manage your reservation." : `Your place for this ${resolvedKind} is confirmed. You can return to the details or view your calendar.`
      : paymentState === "failed" ? "This checkout did not complete, expired, or was refunded. Return to the activity to check current availability."
        : "We haven't verified your registration yet. Check again before starting another payment. If you already paid, keep your receipt and check your activity details.";

  return <CastingPublicShell>
    <article className="casting-page">
      <header className="casting-page-header">
        <p className="casting-section-title">{resolvedKind}</p>
        <h1 className="casting-page-title" role="status">{headline}</h1>
        {status?.activityTitle ? <p className="casting-page-subtitle">{status.activityTitle}</p> : null}
      </header>
      <section className="casting-glass-card">
        <p className="casting-body-copy">{summary}</p>
        {error ? <p className="public-review-error" role="alert">{error}</p> : null}
      </section>
      {confirmed && stripeSessionId ? <section className="casting-glass-card">
        <h2 className="casting-section-title">Receipt</h2>
        <p className="casting-body-copy">Keep your Stripe receipt for this reservation.</p>
      </section> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {stripeSessionId && (signedIn || guestReceiptAvailable) && !confirmed && !loading ? <button type="button" className="casting-submit-button" onClick={() => { setLoading(true); setError(null); setAttempt((value) => value + 1); }}>Check confirmation again</button> : null}
        {backHref ? <Link className="casting-submit-button" href={backHref}>View {resolvedKind} details</Link> : null}
        <Link className="casting-page-cta casting-page-cta--secondary" style={{ textAlign: "center", minHeight: 48 }} href={signedIn ? "/schedule" : signInHref}>{signedIn ? "View calendar" : "Sign in to your Motiion account"}</Link>
        {!signedIn ? <p className="casting-body-copy">Use the email from your reservation. If you booked as a guest, choose “Forgot password” on the sign-in page to set up access.</p> : null}
      </div>
    </article>
  </CastingPublicShell>;
}
