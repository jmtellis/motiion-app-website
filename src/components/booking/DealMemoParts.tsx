import {
  DECLINE_REASONS,
  type DealLine,
  formatBps,
  formatCents,
  getModuleSpec,
  type StatusChip,
} from "@/lib/booking/deal-memo";
import type { DealMemoEvent } from "@/lib/booking/deal-memo-types";

const CHIP_TONE: Record<StatusChip, string> = {
  "Draft offer": "neutral",
  "Awaiting talent": "accent",
  "Changes requested": "attention",
  "Awaiting industry": "accent",
  "Ready for payment": "attention",
  "Paid / Booked": "success",
  Declined: "danger",
  Expired: "neutral",
  Canceled: "neutral",
};

export function DealMemoChip({ chip }: { chip: StatusChip }) {
  return (
    <span className="deal-memo__chip" data-tone={CHIP_TONE[chip]}>
      <span className="deal-memo__sr-only">Status: </span>
      {chip}
    </span>
  );
}

/** Fee on top: Industry pays deal + Motiion fee; Talent receives the full deal. */
export function FeePreview({
  lines,
  talentDealCents,
  platformFeeBps,
  platformFeeCents,
  chargeAmountCents,
  viewer,
  agencyClause,
  heading = "Payment summary",
}: {
  lines: DealLine[];
  talentDealCents: number;
  platformFeeBps: number;
  platformFeeCents: number;
  chargeAmountCents: number;
  viewer: "industry" | "talent";
  agencyClause: boolean;
  heading?: string;
}) {
  return (
    <section className="deal-memo__panel deal-memo__fee" aria-labelledby="deal-memo-fee-heading">
      <h2 id="deal-memo-fee-heading">{heading}</h2>
      {lines.length ? (
        lines.map((line) => (
          <div className="deal-memo__fee-row" key={line.label}>
            <span>{line.label}</span>
            <strong>{formatCents(line.cents)}</strong>
          </div>
        ))
      ) : (
        <p className="deal-memo__sub">Add guaranteed rates to see the deal.</p>
      )}
      <div className="deal-memo__fee-row" data-total="true">
        <span>Talent deal</span>
        <strong>{formatCents(talentDealCents)}</strong>
      </div>
      {viewer === "industry" ? (
        <>
          <div className="deal-memo__fee-row">
            <span>Motiion platform fee ({formatBps(platformFeeBps)}, on top)</span>
            <strong>{formatCents(platformFeeCents)}</strong>
          </div>
          <div className="deal-memo__fee-row" data-total="true">
            <span>Total you pay</span>
            <strong>{formatCents(chargeAmountCents)}</strong>
          </div>
          <p className="deal-memo__sub">
            The talent receives the full deal of {formatCents(talentDealCents)}. Motiion&apos;s fee is added on top and
            never taken from the talent.
          </p>
        </>
      ) : (
        <p className="deal-memo__sub">
          You receive the full deal of {formatCents(talentDealCents)}. Motiion&apos;s fee is paid by Industry on top.
        </p>
      )}
      {agencyClause ? (
        <p className="deal-memo__note">
          Agency commission is part of the deal between talent and agency. It is separate from, and not included in,
          the Motiion fee.
        </p>
      ) : null}
      <p className="deal-memo__sub">
        Guaranteed rates are charged today. Overtime, per diems and extra shows follow the memo&apos;s payment terms.
      </p>
    </section>
  );
}

const DATE_TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function moduleLabel(code: unknown) {
  return typeof code === "string" ? getModuleSpec(code)?.label ?? code : "";
}

function eventText(event: DealMemoEvent, viewer: "industry" | "talent", counterpartName: string): string {
  const who = event.actor_role === viewer ? "You" : event.actor_role === "industry" || event.actor_role === "talent" ? counterpartName : "Motiion";
  const payload = event.payload ?? {};
  switch (event.action) {
    case "draft_saved":
      return "Draft created.";
    case "sent":
      return `${who} sent the deal memo.`;
    case "talent_flagged": {
      const modules = Array.isArray(payload.modules) ? payload.modules : [];
      const names = modules.map((m) => moduleLabel((m as Record<string, unknown>).module_code)).filter(Boolean);
      return `${who} requested changes${names.length ? `: ${names.join(", ")}` : ""}.`;
    }
    case "industry_replied":
      return `${who} responded to the requested changes.`;
    case "talent_accepted":
      return `${who} accepted and signed the deal.`;
    case "call_requested":
      return `${who} asked to schedule a call${typeof payload.note === "string" && payload.note ? `: “${payload.note}”` : "."}`;
    case "declined": {
      const reason = DECLINE_REASONS.find((r) => r.value === payload.reason)?.label;
      return `${who} declined${reason ? ` (${reason})` : ""}.`;
    }
    case "cancelled":
      return payload.reason === "superseded_by_late_payment" ? "Canceled because an earlier memo was paid." : `${who} canceled the deal memo.`;
    case "expired":
      return "Ready for payment expired.";
    case "industry_signed":
      return `${who} signed the deal memo.`;
    case "checkout_started":
      return `${who} started payment.`;
    case "payment_processing":
      return "Payment is processing.";
    case "payment_succeeded":
      return payload.applied === false ? "A payment needs Motiion review." : "Payment complete. Booked.";
    case "payment_failed":
      return "Payment didn’t go through.";
    case "refunded":
      return payload.full ? "Payment refunded." : "Payment partially refunded.";
    case "dispute_opened":
      return "A payment dispute was opened.";
    case "dispute_closed":
      return "The payment dispute was closed.";
    default:
      return event.action.replace(/_/g, " ");
  }
}

export function DealMemoThread({
  events,
  viewer,
  counterpartName,
}: {
  events: DealMemoEvent[];
  viewer: "industry" | "talent";
  counterpartName: string;
}) {
  const visible = events.filter((e) => viewer === "industry" || e.action !== "draft_saved");
  return (
    <section className="deal-memo__panel" aria-labelledby="deal-memo-thread-heading">
      <h2 id="deal-memo-thread-heading">Thread</h2>
      {visible.length ? (
        <ol className="deal-memo__thread">
          {visible.map((event) => (
            <li key={event.id}>
              <span>{eventText(event, viewer, counterpartName)}</span>
              <time dateTime={event.created_at}>{DATE_TIME.format(new Date(event.created_at))}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="deal-memo__sub">Activity on this deal memo will appear here.</p>
      )}
    </section>
  );
}
