"use client";

import { useState, useTransition } from "react";

import { openBillingPortal, startIndustryCheckout } from "@/lib/billing/actions";
import type { EntitlementTier } from "@/lib/billing/entitlement";

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
}: {
  tier: EntitlementTier;
  active: boolean;
  currentPeriodEnd: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPro = active && tier === "pro";
  const renewal = formatPeriodEnd(currentPeriodEnd);

  function go(action: () => Promise<{ url: string | null; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
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
          <p className="text-sm font-semibold text-white/92">
            {isPro ? "Industry Pro" : "Free plan"}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {isPro
              ? renewal
                ? `Access through ${renewal}.`
                : "Your subscription is active."
              : "Start a 60-day free trial ($200/month after). Enter a founder code at checkout for free access."}
          </p>
        </div>
        {isPro ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(openBillingPortal)}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/6 disabled:opacity-50"
          >
            {isPending ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(startIndustryCheckout)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90 disabled:opacity-50"
          >
            {isPending ? "Redirecting…" : "Start 60-day free trial"}
          </button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
    </div>
  );
}
