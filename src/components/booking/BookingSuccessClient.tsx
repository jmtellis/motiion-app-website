"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { callSupabaseFunction } from "@/lib/supabaseRest";
import type { PublicActivityKind } from "@/types/public";

const SITE_HOME = "https://www.motiion.app";

type CheckoutStatus = {
  status: string;
  activityId: string;
  activityTitle: string | null;
  activityKind?: PublicActivityKind;
  sessionId: string;
  customerEmail?: string | null;
  reconciled?: boolean;
};

export type BookingSuccessProps = {
  stripeSessionId: string | null;
  activityId: string | null;
  kind: PublicActivityKind | null;
  enrolled: boolean;
  title: string | null;
  email: string | null;
};

function kindLabel(kind: PublicActivityKind | null): string {
  switch (kind) {
    case "class":
      return "Class";
    case "session":
      return "Session";
    case "event":
      return "Event";
    default:
      return "Booking";
  }
}

function activityHref(kind: PublicActivityKind | null, activityId: string | null): string | null {
  if (!activityId) return null;
  const prefix = kind === "session" ? "/session" : kind === "event" ? "/event" : "/class";
  return `${prefix}/${encodeURIComponent(activityId)}`;
}

export function BookingSuccessClient({
  stripeSessionId,
  activityId,
  kind,
  enrolled,
  title,
  email,
}: BookingSuccessProps) {
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(stripeSessionId));
  const [error, setError] = useState<string | null>(null);

  const resolvedKind = status?.activityKind ?? kind ?? "class";
  const resolvedActivityId = activityId ?? status?.activityId ?? null;
  const resolvedTitle = status?.activityTitle ?? title;
  const resolvedEmail = status?.customerEmail ?? email;
  const backHref = activityHref(resolvedKind, resolvedActivityId);
  const isPaidFlow = Boolean(stripeSessionId);
  const isFreeEnrollment = enrolled && !isPaidFlow;

  useEffect(() => {
    if (!stripeSessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    async function poll() {
      try {
        const data = await callSupabaseFunction<CheckoutStatus>("web-checkout-status", {
          sessionId: stripeSessionId,
        });
        if (cancelled) return;
        setStatus(data);
        setError(null);

        const normalized = data.status.trim().toLowerCase();
        if (normalized === "succeeded" || normalized === "paid" || normalized === "complete" || data.reconciled) {
          setLoading(false);
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to confirm payment.");
        }
      }

      attempts += 1;
      if (attempts < maxAttempts && !cancelled) {
        window.setTimeout(poll, 1500);
      } else if (!cancelled) {
        setLoading(false);
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [stripeSessionId]);

  const headline = useMemo(() => {
    if (loading) return "Confirming your booking…";
    if (resolvedKind === "session") return "Request received";
    if (isFreeEnrollment) return "You're registered";
    return "Payment successful";
  }, [loading, resolvedKind, isFreeEnrollment]);

  const summary = useMemo(() => {
    if (loading) {
      return "We're confirming your payment and securing your spot. This usually takes a few seconds.";
    }
    if (resolvedKind === "session") {
      return "Open the Motiion app with the same email you used here to finish your join request and get updates from the organizer.";
    }
    if (isFreeEnrollment) {
      return "Your spot is reserved. Finish setting up your Motiion profile in the app to view your schedule and get class updates.";
    }
    return "You're booked for this class. Finish setting up your Motiion profile in the app to view your schedule and get updates from the organizer.";
  }, [loading, resolvedKind, isFreeEnrollment]);

  return (
    <CastingPublicShell>
      <article className="casting-page">
        <header className="casting-page-header">
          <p className="casting-section-title">{kindLabel(resolvedKind)}</p>
          <h1 className="casting-page-title">{headline}</h1>
          {resolvedTitle ? <p className="casting-page-subtitle">{resolvedTitle}</p> : null}
        </header>

        <section className="casting-glass-card">
          <p className="casting-body-copy">{summary}</p>
          {error ? (
            <p className="public-review-error" style={{ marginTop: 12 }}>
              {error} If you were charged, your booking should appear in the app shortly.
            </p>
          ) : null}
        </section>

        {isPaidFlow && !loading ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Receipt</h2>
            <p className="casting-body-copy">
              {resolvedEmail
                ? `Check ${resolvedEmail} for your Stripe payment receipt.`
                : "Check the email you used at checkout for your Stripe payment receipt."}
            </p>
          </section>
        ) : null}

        <section className="casting-glass-card">
          <h2 className="casting-section-title">Next step</h2>
          <p className="casting-body-copy">
            Download Motiion and sign in with the same email you used here to complete your profile,
            see your bookings, and receive organizer updates.
          </p>
        </section>

        <div style={{ display: "grid", gap: 10 }}>
          <a href={`${SITE_HOME}/signup`} className="casting-submit-button" style={{ textDecoration: "none" }}>
            Finish setup in Motiion
          </a>
          <a
            href={SITE_HOME}
            className="casting-btn-primary"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            Get the app
          </a>
          {backHref ? (
            <Link href={backHref} className="casting-modal-dismiss" style={{ textAlign: "center" }}>
              Back to {kindLabel(resolvedKind).toLowerCase()}
            </Link>
          ) : null}
        </div>
      </article>
    </CastingPublicShell>
  );
}
