import { DealMemoList } from "@/components/booking/DealMemoDesk";
import { PayoutSetupCard } from "@/components/booking/PayoutSetupCard";
import { requireTalentAccount } from "@/lib/auth/session";
import { loadTalentDealMemos } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "Deal memos · Motiion" };

export default async function TalentDealMemosPage() {
  const profile = await requireTalentAccount();
  const { memos, payout, error } = await loadTalentDealMemos(profile.id);

  return (
    <div className="deal-memo" data-theme="light">
      <div className="deal-memo__inner">
        <header className="deal-memo__header">
          <div>
            <p className="deal-memo__eyebrow">Bookings</p>
            <h1>Deal memos</h1>
            <p className="deal-memo__sub">Review offers, request changes, and accept to get booked.</p>
          </div>
        </header>
        <div className="deal-memo__grid">
          <section className="deal-memo__panel deal-memo__stack" aria-labelledby="talent-deal-memos-heading" style={{ gap: 12 }}>
            <h2 id="talent-deal-memos-heading" style={{ margin: 0 }}>
              Offers
            </h2>
            {error ? (
              <p role="alert" className="deal-memo__note" data-tone="danger">
                Could not load your deal memos. Please refresh to try again.
              </p>
            ) : (
              <DealMemoList
                memos={memos}
                viewer="talent"
                hrefFor={(id) => `/deal-memos/${id}`}
                emptyCopy="When Industry sends you a booking offer after you confirm availability, it will appear here."
              />
            )}
          </section>
          <aside className="deal-memo__aside" aria-label="Payouts">
            <PayoutSetupCard payout={payout} returnPath="/deal-memos/payouts" />
          </aside>
        </div>
      </div>
    </div>
  );
}
