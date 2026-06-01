"use client";

import {
  activityAccentColor,
  activityKindLabel,
  formatActivityDateTime,
  formatMoney,
} from "@/lib/publicActivity";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { ProductShell } from "@/components/product/ProductShell";
import type { PublicActivity } from "@/types/public";

export default function ActivityPageClient({ activity }: { activity: PublicActivity }) {
  const accent = activityAccentColor(activity.kind);
  const dateLine = formatActivityDateTime(activity);
  const priceLine = activity.requirePayment
    ? formatMoney(activity.priceAmountCents, activity.priceCurrency ?? "usd")
    : null;

  return (
    <ProductShell>
      <article style={{ display: "grid", gap: 20 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <span
            className="product-pill"
            style={{ width: "fit-content", borderColor: accent, color: accent }}
          >
            {activityKindLabel(activity.kind)}
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
            {activity.title}
          </h1>
        </header>

        <div className="product-activity-hero">
          {activity.coverImageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activity.coverImageURL} alt="" />
          ) : null}
          <div className="product-activity-hero-overlay" />
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{dateLine}</p>
            {activity.location ? (
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-low)" }}>{activity.location}</p>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {priceLine ? (
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--primary-500)" }}>{priceLine}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-low)" }}>Free to attend</p>
            )}
            {activity.spotsRemaining != null ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-low)" }}>
                {activity.spotsRemaining > 0
                  ? `${activity.spotsRemaining} spots remaining`
                  : "Sold out"}
              </p>
            ) : null}
          </div>
          <ActivityDateStack activityDate={activity.activityDate} />
        </div>

        {activity.pricingTiers && activity.pricingTiers.length > 1 ? (
          <section className="product-glass-card" style={{ padding: 16 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Tickets</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {activity.pricingTiers.map((tier) => (
                <li
                  key={tier.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 14,
                  }}
                >
                  <span>{tier.label}</span>
                  <span style={{ fontWeight: 700 }}>{formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activity.organizerDisplayName ? (
          <section className="product-glass-card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            {activity.organizerHeadshotURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activity.organizerHeadshotURL}
                alt=""
                style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--surface-accent)",
                }}
              />
            )}
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-low)" }}>Organizer</p>
              <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700 }}>{activity.organizerDisplayName}</p>
            </div>
          </section>
        ) : null}

        {activity.description?.trim() ? (
          <section>
            <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>About</h2>
            <p style={{ margin: 0, color: "var(--text-low)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
              {activity.description.trim()}
            </p>
          </section>
        ) : null}

        {!activity.isEligibleForBooking ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-low)" }}>
            This activity is no longer open for booking on the web. Open Motiion for the latest status.
          </p>
        ) : null}

        <OpenInAppBar
          label={
            activity.isEligibleForBooking ? "Book in the Motiion app" : "Open in the Motiion app"
          }
        />
      </article>
    </ProductShell>
  );
}

function ActivityDateStack({ activityDate }: { activityDate: string | null }) {
  if (!activityDate) return null;

  const d = new Date(`${activityDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  return (
    <div className="product-date-stack" aria-hidden>
      <div className="month">{d.toLocaleDateString(undefined, { month: "short" })}</div>
      <div className="day">{d.getDate()}</div>
    </div>
  );
}
