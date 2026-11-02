import { TalentBookingsView } from "@/components/booking/TalentBookingsView";
import { loadTalentBookingInbox } from "@/lib/booking/booking-inbox";
import { fetchTalentOpportunities } from "@/lib/app/talent-castings";
import { PayoutSetupCard } from "@/components/booking/PayoutSetupCard";
import { requireTalentAccount } from "@/lib/auth/session";
import { loadTalentDealMemos } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "Bookings · Motiion" };

export default async function TalentDealMemosPage() {
  const profile = await requireTalentAccount();
  const [{ memos, payout, error }, inbox, opportunities] = await Promise.all([
    loadTalentDealMemos(profile.id),
    loadTalentBookingInbox(),
    fetchTalentOpportunities(),
  ]);

  return (
    <div className="deal-memo bookings-page" data-theme="light">
      <header className="deal-memo__header">
        <div>
          <h1>Bookings</h1>
          <p className="deal-memo__sub">
            Review offers, request changes, and accept to get booked.
          </p>
        </div>
      </header>
      <div className="deal-memo__grid">
        <section
          className="deal-memo__stack"
          aria-label="Bookings"
          style={{ gap: 12 }}
        >
          <TalentBookingsView
            bookings={inbox.bookings}
            memos={memos}
            submissions={opportunities.submitted}
            error={error || inbox.error}
          />
        </section>
        <aside className="deal-memo__aside" aria-label="Payouts">
          <PayoutSetupCard payout={payout} returnPath="/deal-memos/payouts" />
        </aside>
      </div>
    </div>
  );
}
