import Link from "next/link";
import { redirect } from "next/navigation";

import { PayoutSetupCard } from "@/components/booking/PayoutSetupCard";
import { requireTalentAccount } from "@/lib/auth/session";
import { bookingPayoutLink, fetchBookingPayoutStatus } from "@/lib/booking/deal-memo-actions";
import { loadTalentPayoutStatus } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "Booking payouts · Motiion" };

const RETURN_PATH = "/deal-memos/payouts";

export default async function BookingPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ payouts?: string }>;
}) {
  const profile = await requireTalentAccount();
  const { payouts } = await searchParams;

  // Stripe sends expired or already-used Account Links to refresh_url; mint a fresh one.
  if (payouts === "refresh") {
    const link = await bookingPayoutLink("onboarding_link", RETURN_PATH);
    if (link.ok && link.data.url) redirect(link.data.url);
  }

  const live = await fetchBookingPayoutStatus();
  const payout = live.ok ? live.data.payout : await loadTalentPayoutStatus(profile.id);
  const returned = payouts === "return";

  return (
    <div className="deal-memo" data-theme="light">
      <div className="deal-memo__inner" style={{ maxWidth: 640 }}>
        <header className="deal-memo__header">
          <div>
            <p className="deal-memo__eyebrow">Bookings</p>
            <h1>Booking payouts</h1>
            <p className="deal-memo__sub">
              Where Industry payments for your deal memos are sent. This is separate from class payouts.
            </p>
          </div>
        </header>
        <div className="deal-memo__stack">
          {returned ? (
            <p className="deal-memo__note" data-tone={payout?.ready ? "success" : "attention"} role="status">
              {payout?.ready
                ? "You're all set. Industry can now pay for your accepted deal memos."
                : "Thanks. Stripe may need a little more information, or is still reviewing your details."}
            </p>
          ) : null}
          {!live.ok ? (
            <p className="deal-memo__note" data-tone="danger" role="alert">
              Could not refresh your status from Stripe. Showing the last known status.
            </p>
          ) : null}
          <PayoutSetupCard payout={payout} returnPath={RETURN_PATH} />
          <Link className="deal-memo__btn" data-variant="ghost" href="/deal-memos">
            Back to deal memos
          </Link>
        </div>
      </div>
    </div>
  );
}
