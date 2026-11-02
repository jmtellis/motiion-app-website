"use client";
import { INDUSTRY_OFFER } from "@/lib/billing/industry-offer";

import { useState, useTransition } from "react";

import { openBillingPortal, startIndustryCheckout } from "@/lib/billing/actions";
import type { EntitlementTier, UserEntitlement } from "@/lib/billing/entitlement";

function formatPeriodEnd(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function BuyerBillingSection({
  tier,
  active,
  currentPeriodEnd,
  source,
}: {
  tier: EntitlementTier;
  active: boolean;
  currentPeriodEnd: string | null;
  source?: UserEntitlement["source"];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPro = active && tier === "pro";
  const renewal = formatPeriodEnd(currentPeriodEnd);

  function go(action: () => Promise<{ url: string | null; error?: string }>) {
    setError(null);
    startTransition(async () => {
      let result: { url: string | null; error?: string };
      try { result = await action(); }
      catch { setError("Could not connect to billing. Please retry."); return; }
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Something went wrong. Try again.");
    });
  }

  return (
    <div className="bd-muted-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ui-text)]">
            {isPro ? "Industry Pro" : "Free plan"}
          </p>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">
            {isPro
              ? renewal
                ? `Access through ${renewal}.`
                : "Your subscription is active."
              : `${INDUSTRY_OFFER.description} Eligible promotion codes can be entered at checkout.`}
          </p>
        </div>
        {isPro && source === "apple_iap" ? (
          <a className="ui-button ui-button--secondary" href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer">Manage App Store subscription</a>
        ) : isPro && source !== "stripe" ? (
          <p className="text-sm text-[var(--ui-muted)]">Your access is provided by Motiion. No web billing is required.</p>
        ) : isPro ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(openBillingPortal)}
            className="ui-button ui-button--secondary"
          >
            {isPending ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(startIndustryCheckout)}
            className="bd-btn-primary disabled:opacity-50"
          >
            {isPending ? "Redirecting…" : INDUSTRY_OFFER.cta}
          </button>
        )}
      </div>
      {error ? <p className="ui-notice mt-3" data-tone="error" role="alert">{error}</p> : null}
    </div>
  );
}
