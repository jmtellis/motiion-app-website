"use client";

import { useState, useTransition } from "react";

import { bookingPayoutLink, startBookingPayoutSetup } from "@/lib/booking/deal-memo-actions";
import type { PayoutStatus } from "@/lib/booking/deal-memo-types";

/** Talent booking payouts (Stripe Accounts v2 recipient). Separate from class instructor payouts. */
export function PayoutSetupCard({
  payout,
  returnPath,
  compact = false,
}: {
  payout: PayoutStatus | null;
  returnPath?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (run: () => ReturnType<typeof startBookingPayoutSetup>) => {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (result.ok && result.data.url) {
        window.location.assign(result.data.url);
        return;
      }
      setError(result.ok ? "Could not open payout setup. Please try again." : result.error);
    });
  };

  const ready = payout?.ready === true;
  const restricted = payout?.transfersStatus === "restricted" || (payout?.requirementsPastDue ?? 0) > 0;

  return (
    <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-payout-heading" style={{ gap: 12 }}>
      <div className="deal-memo__module-head">
        <h2 id="deal-memo-payout-heading" style={{ margin: 0 }}>
          Booking payouts
        </h2>
        <span className="deal-memo__badge" data-tone={ready ? "success" : restricted ? "danger" : "attention"}>
          {ready ? "Ready" : restricted ? "Action needed" : payout?.hasAccount ? "In progress" : "Not set up"}
        </span>
      </div>
      {!compact ? (
        <p className="deal-memo__sub">
          {ready
            ? "Industry can pay you for accepted deal memos. Payouts go to the account you added with Stripe."
            : "Set up payouts so Industry can pay for your booking. You can negotiate and accept before this is done."}
        </p>
      ) : null}
      {error ? (
        <p className="deal-memo__note" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="deal-memo__actions">
        {ready ? (
          <>
            <button type="button" className="deal-memo__btn" data-variant="secondary" disabled={pending} onClick={() => go(() => bookingPayoutLink("dashboard_link", returnPath))}>
              Open payout dashboard
            </button>
            <button type="button" className="deal-memo__btn" data-variant="ghost" disabled={pending} onClick={() => go(() => bookingPayoutLink("update_link", returnPath))}>
              Update details
            </button>
          </>
        ) : (
          <button type="button" className="deal-memo__btn" disabled={pending} onClick={() => go(() => startBookingPayoutSetup(returnPath))}>
            {pending ? "Opening Stripe…" : payout?.hasAccount ? "Continue payout setup" : "Set up payouts"}
          </button>
        )}
      </div>
    </section>
  );
}
