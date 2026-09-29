"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";

import { formatCents } from "@/lib/booking/deal-memo";

/** Stripe Payment Element (card only) for the booking PaymentIntent. */
export function BookingPaymentElement({
  clientSecret,
  amountCents,
  returnUrl,
  theme,
  onPaid,
}: {
  clientSecret: string;
  amountCents: number;
  returnUrl: string;
  theme: "light" | "dark";
  onPaid: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Payments are not configured.");
      return;
    }
    let cancelled = false;
    let unmount: (() => void) | null = null;
    void loadStripe(publishableKey).then((stripe) => {
      if (cancelled || !stripe || !mountRef.current) {
        if (!stripe && !cancelled) setError("Could not load the payment form. Refresh to try again.");
        return;
      }
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: theme === "dark" ? "night" : "stripe",
          variables: { borderRadius: "10px", spacingUnit: "4px" },
        },
      });
      const payment = elements.create("payment", { layout: "tabs" });
      payment.on("ready", () => setReady(true));
      payment.mount(mountRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;
      unmount = () => payment.destroy();
    });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [clientSecret, theme]);

  const pay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (confirmError) {
      setError(confirmError.message ?? "Payment didn’t go through. Try another card.");
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) onPaid();
  };

  return (
    <div className="deal-memo__payment">
      <div ref={mountRef} className="deal-memo__payment-element" aria-busy={!ready} />
      {error ? (
        <p className="deal-memo__note" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="deal-memo__btn" disabled={!ready || submitting} onClick={() => void pay()}>
        {submitting ? "Processing…" : `Pay ${formatCents(amountCents)} and book`}
      </button>
    </div>
  );
}
