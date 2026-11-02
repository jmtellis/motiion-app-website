"use client";
import { INDUSTRY_OFFER } from "@/lib/billing/industry-offer";

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
      let result: { url: string | null; error?: string };
      try { result = await startIndustryCheckout(); }
      catch { setError("Could not connect to billing. Please retry."); return; }
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start checkout. Try again.");
    });
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-[var(--ui-muted)] uppercase">Industry Pro</p>
      <h1 className="text-2xl font-semibold text-[var(--ui-text)]">Upgrade to Industry Pro</h1>
      <p className="text-sm leading-relaxed text-[var(--ui-muted)]">
        {feature} requires Industry Pro. {INDUSTRY_OFFER.description} Eligible promotion codes can be entered at checkout.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={upgrade}
        className="bd-btn-primary mt-2 px-6 py-2.5 disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : INDUSTRY_OFFER.cta}
      </button>
      <p className="text-xs text-[var(--ui-muted)]">Cancel anytime from Settings → Billing.</p>
      {error ? <p className="text-sm text-[var(--ui-danger)]">{error}</p> : null}
    </div>
  );
}
