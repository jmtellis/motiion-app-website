"use client";

import { useEffect, useState, useTransition } from "react";

import {
  fetchConnectAccountStatus,
  startStripeConnectOnboarding,
} from "@/app/(buyer-app)/(paid)/calendar/connect-actions";
import type { ConnectAccountStatus } from "@/lib/talent-buyers/activities/types";

export function BuyerConnectPaymentsSection({
  highlightReturn = false,
}: {
  highlightReturn?: boolean;
}) {
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchConnectAccountStatus();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error ?? "Could not load Stripe status.");
        setLoading(false);
        return;
      }
      setStatus(result.status ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startOnboarding() {
    setError(null);
    startTransition(async () => {
      const result = await startStripeConnectOnboarding();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start Stripe onboarding.");
    });
  }

  const ready = status?.isReadyToAcceptPayments === true;

  return (
    <div className="bd-muted-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/92">Ticket & class payouts</p>
          <p className="mt-1 text-sm text-white/50">
            {loading
              ? "Checking Stripe Connect…"
              : ready
                ? "Stripe Connect is ready. You can sell tickets and paid classes."
                : "Connect Stripe to accept ticket and class payments. This is separate from your Industry Pro subscription."}
          </p>
          {highlightReturn && !ready ? (
            <p className="mt-2 text-sm text-[#2dd4bf]">
              Finish any remaining Stripe steps, then return here to confirm you&apos;re ready.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={loading || isPending || ready}
          onClick={startOnboarding}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90 disabled:opacity-50"
        >
          {isPending ? "Redirecting…" : ready ? "Connected" : "Set up payouts"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
    </div>
  );
}
