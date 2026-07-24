"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { loadStripe } from "@stripe/stripe-js";

import {
  getIndustryIdentityStatus,
  refreshIndustryIdentityVerification,
  startIndustryIdentityVerification,
} from "@/app/talent-buyers/onboarding/identity-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { trackClientEvent } from "@/lib/analytics/track-client";

type IndustryIdentityGateProps = {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  reason?: "publish" | "contact";
};

export function IndustryIdentityGate({
  open,
  onClose,
  onVerified,
  reason = "publish",
}: IndustryIdentityGateProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    trackClientEvent("industry_verification_prompted", { reason });
  }, [open, reason]);

  async function pollUntilSettled() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await refreshIndustryIdentityVerification();
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      if (result.verified) {
        trackClientEvent("industry_verification_completed", { reason });
        return true;
      }
      if (result.status === "requires_input" || result.status === "canceled") {
        return false;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    return false;
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    trackClientEvent("industry_verification_started", { reason });
    try {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError("Stripe publishable key is not configured.");
        return;
      }

      const started = await startIndustryIdentityVerification();
      if (!started.ok) {
        setError(started.error);
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        setError("Could not load Stripe Identity.");
        return;
      }

      const { error: stripeError } = await stripe.verifyIdentity(started.clientSecret);
      if (stripeError) {
        setError(stripeError.message ?? "Identity verification was not completed.");
      }

      const verified = await pollUntilSettled();
      if (verified) {
        onVerified();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hire with confidence."
      description="Verify your identity to contact talent and publish opportunities. This helps keep Motiion safe for everyone."
      size="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy || isPending}>
            Not now
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || isPending}
            onClick={() => {
              startTransition(() => {
                void handleVerify();
              });
            }}
          >
            {busy || isPending ? "Opening…" : "Verify identity"}
          </button>
        </div>
      }
    >
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <p className="text-sm text-[var(--ink-soft)]">
        Have a government-issued photo ID ready. Stripe will confirm your ID and a live selfie.
      </p>
    </Modal>
  );
}

/**
 * Prefetch verification status and gate a callback behind the identity modal.
 */
export function useIndustryIdentityGate(reason: "publish" | "contact" = "publish") {
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getIndustryIdentityStatus().then((result) => {
      if (cancelled || !result.ok) return;
      setVerified(result.verified);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runWithIdentity = useCallback(
    (action: () => void) => {
      if (verified === true) {
        action();
        return;
      }

      void getIndustryIdentityStatus().then((result) => {
        if (result.ok && result.verified) {
          setVerified(true);
          action();
          return;
        }
        setPendingAction(() => action);
        setOpen(true);
      });
    },
    [verified],
  );

  const gate = (
    <IndustryIdentityGate
      open={open}
      reason={reason}
      onClose={() => {
        setOpen(false);
        setPendingAction(null);
      }}
      onVerified={() => {
        setVerified(true);
        const action = pendingAction;
        setPendingAction(null);
        action?.();
      }}
    />
  );

  return { runWithIdentity, gate, verified, identityRequiredLabel: "Verify identity to continue" };
}
