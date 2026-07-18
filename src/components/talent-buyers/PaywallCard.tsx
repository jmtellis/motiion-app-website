"use client";

import { useEffect, useState, useTransition } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";
import { startIndustryCheckout } from "@/lib/billing/actions";

export function PaywallCard({ feature }: { feature: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    trackClientEvent("paywall_viewed", { feature });
  }, [feature]);

  function upgrade() {
    setError(null);
    startTransition(async () => {
      const result = await startIndustryCheckout();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start checkout. Try again.");
    });
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-white/42 uppercase">Industry Pro</p>
      <h1 className="text-2xl font-semibold text-white/92">Start your free trial</h1>
      <p className="text-sm leading-relaxed text-white/55">
        {feature} requires Industry Pro. Get 60 days free, then $200/month. Enter a card to start —
        you won’t be charged until the trial ends. Have a founder code? Enter it at checkout.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={upgrade}
        className="mt-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90 disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : "Start 60-day free trial"}
      </button>
      <p className="text-xs text-white/40">Cancel anytime from Settings → Billing.</p>
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}
    </div>
  );
}
