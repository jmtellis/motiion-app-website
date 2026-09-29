import Link from "next/link";

import { formatCents, isMemoExpired, memoStatusChip, type MemoParty } from "@/lib/booking/deal-memo";
import type { ConfirmedAvailability, DealMemoListItem } from "@/lib/booking/deal-memo-types";
import { DealMemoChip } from "./DealMemoParts";

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function DealMemoList({
  memos,
  viewer,
  hrefFor,
  emptyCopy,
}: {
  memos: DealMemoListItem[];
  viewer: MemoParty;
  hrefFor: (id: string) => string;
  emptyCopy: string;
}) {
  if (!memos.length) return <p className="deal-memo__sub">{emptyCopy}</p>;
  return (
    <ul className="deal-memo__list">
      {memos.map((memo) => {
        const chip = memoStatusChip(memo, viewer);
        const amount = viewer === "industry" ? memo.charge_amount_cents : memo.talent_deal_cents;
        return (
          <li key={memo.id}>
            <Link href={hrefFor(memo.id)} className="deal-memo__list-link">
              <span>
                <strong>{memo.title}</strong>
                <small>
                  {memo.counterpartName}
                  {amount ? ` · ${formatCents(amount)}${viewer === "industry" ? " total" : ""}` : ""}
                  {memo.status === "payment_pending" && memo.expires_at && !isMemoExpired(memo)
                    ? ` · Pay by ${DAY.format(new Date(memo.expires_at))}`
                    : ""}
                </small>
              </span>
              <DealMemoChip chip={chip} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function IndustryDealMemoDesk({
  confirmed,
  memos,
  error,
}: {
  confirmed: ConfirmedAvailability[];
  memos: DealMemoListItem[];
  error: boolean;
}) {
  const ready = confirmed.filter((row) => !row.openMemoId);
  return (
    <div className="deal-memo" data-theme="light" data-embedded="true">
      <div className="deal-memo__grid" data-layout="even">
        <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-desk-confirmed" style={{ gap: 12 }}>
          <div>
            <h2 id="deal-memo-desk-confirmed" style={{ margin: 0 }}>Ready to book</h2>
            <p className="deal-memo__sub">Talent who confirmed availability. Start a deal memo to send terms.</p>
          </div>
          {error ? (
            <p role="alert" className="deal-memo__note" data-tone="danger">
              Could not load deal memos. Please refresh to try again.
            </p>
          ) : ready.length ? (
            <ul className="deal-memo__list">
              {ready.map((row) => (
                <li key={row.id}>
                  <div className="deal-memo__list-link">
                    <span>
                      <strong>{row.talentName}</strong>
                      <small>
                        {row.title}
                        {row.responseKind === "available_with_conflict" ? " · Available with a conflict" : " · Available"}
                      </small>
                    </span>
                    <Link
                      className="deal-memo__btn"
                      data-size="small"
                      href={`/bookings/deal-memos/new?availability=${row.id}`}
                      aria-label={`Start deal memo for ${row.talentName}, ${row.title}`}
                    >
                      Start deal memo
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="deal-memo__sub">
              When talent confirms an availability request, you can send them a deal memo from here.
            </p>
          )}
        </section>
        <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-desk-memos" style={{ gap: 12 }}>
          <div>
            <h2 id="deal-memo-desk-memos" style={{ margin: 0 }}>Deal memos</h2>
            <p className="deal-memo__sub">Negotiate structured terms, then pay to book.</p>
          </div>
          {error ? null : (
            <DealMemoList
              memos={memos}
              viewer="industry"
              hrefFor={(id) => `/bookings/deal-memos/${id}`}
              emptyCopy="No deal memos yet."
            />
          )}
        </section>
      </div>
    </div>
  );
}
