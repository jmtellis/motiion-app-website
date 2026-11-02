"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { registerForActivity } from "@/lib/app/activities";
import { normalizeActivityCheckoutSelection } from "@/lib/app/activity-enrollment";
import { requireGuestReceiptStorage, saveGuestReceipt } from "@/lib/app/guest-receipt";

import { trackClientEvent } from "@/lib/analytics/track-client";
import { callSupabaseFunction } from "@/lib/supabaseRest";
import { formatMoney } from "@/lib/publicActivity";
import type { PublicActivity, PublicTicketOption } from "@/types/public";


type BookResponse =
  | { checkoutUrl: string; sessionId: string; receiptToken?: string }
  | { enrolled: true; activityId: string; activityTitle?: string };

type Props = {
  activity: PublicActivity;
  signedIn?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onEnrolled?: (title: string) => void;
  variant?: "inline" | "modal";
};

function ticketLabel(activity: PublicActivity, ticket: PublicTicketOption) {
  return `${ticket.label} — ${formatMoney(ticket.amountCents, ticket.currency || activity.priceCurrency || "usd")}`;
}

export function ClassGuestBookingForm({ activity, signedIn = false, onPendingChange, onEnrolled, variant = "inline" }: Props) {
  const ticketOptions = activity.ticketOptions ?? [];
  const eventDays = activity.eventDays ?? [];
  const tiers = activity.pricingTiers ?? [];
  const isEvent = activity.kind === "event";
  const draftKey = `motiion:activity-ticket:${activity.id}`;
  const [draft] = useState(() => {
    try { return normalizeActivityCheckoutSelection(JSON.parse(sessionStorage.getItem(draftKey) ?? "null")); }
    catch { return normalizeActivityCheckoutSelection(null); }
  });
  const signInHref = `/login?next=${encodeURIComponent(`/activity/${activity.id}?register=1`)}`;
  const busy = useRef(false);
  const quoteRequest = useRef(0);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ticketOptionId, setTicketOptionId] = useState<string | null>(() => {
    if (draft.ticketOptionId && [...ticketOptions, ...tiers].some((ticket) => ticket.id === draft.ticketOptionId)) return draft.ticketOptionId;
    if (ticketOptions.length > 0) return ticketOptions[0].id;
    if (tiers.length > 0) return tiers[0].id;
    return null;
  });
  const [selectedEventDayIds, setSelectedEventDayIds] = useState<string[]>((draft.selectedEventDayIds ?? []).filter((id) => eventDays.some((day) => day.id === id)));
  const [promoCode, setPromoCode] = useState(draft.promoCode ?? "");
  const [quoteLabel, setQuoteLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [quoting, setQuoting] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ ticketOptionId, selectedEventDayIds, promoCode })); } catch { /* Storage can be unavailable in a private browser. */ }
  }, [draftKey, ticketOptionId, selectedEventDayIds, promoCode]);
  useEffect(() => () => { quoteRequest.current += 1; }, []);
  function invalidateQuote() { quoteRequest.current += 1; setQuoteLabel(null); setQuoting(false); }

  const selectedTicket = ticketOptions.find((ticket) => ticket.id === ticketOptionId) ?? null;

  const soldOut = activity.spotsRemaining != null && activity.spotsRemaining <= 0;
  const showTicketPicker =
    activity.requirePayment && (ticketOptions.length > 0 || tiers.length > 1);
  const isModal = variant === "modal";
  const noun =
    activity.kind === "event" ? "event" : activity.kind === "session" ? "session" : "class";

  function toggleDay(dayId: string) {
    invalidateQuote();
    setSelectedEventDayIds((current) =>
      current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId],
    );
  }

  const refreshQuote = useCallback(async () => {
    if (!activity.requirePayment) {
      setQuoteLabel(null);
      return;
    }
    const request = ++quoteRequest.current;
    setQuoting(true);
    try {
      const quote = await callSupabaseFunction<{
        totalAmountCents: number;
        currency: string;
        promoDiscountCents?: number;
        originalBaseAmountCents?: number;
        baseAmountCents: number;
        serviceFeeCents: number;
      }>("payments-checkout-quote", {
        classId: activity.id,
        ...(ticketOptionId
          ? { ticketOptionId, pricingTierId: ticketOptionId }
          : {}),
        ...(selectedEventDayIds.length ? { selectedEventDayIds } : {}),
        promoCode: promoCode.trim(),
      });
      if (request !== quoteRequest.current) return;
      if (![quote.baseAmountCents, quote.serviceFeeCents, quote.totalAmountCents].every(Number.isFinite)) throw new Error("The price could not be confirmed. Please retry.");
      setQuoteLabel(`Ticket ${formatMoney(quote.baseAmountCents, quote.currency)} + service & processing fees ${formatMoney(quote.serviceFeeCents, quote.currency)} = ${formatMoney(quote.totalAmountCents, quote.currency)} total${quote.promoDiscountCents ? " · promo applied" : ""}`);
      setError(null);
    } catch (err) {
      if (request !== quoteRequest.current) return;
      setQuoteLabel(null);
      setError(err instanceof Error ? err.message : "Could not apply promo code.");
    } finally { if (request === quoteRequest.current) setQuoting(false); }
  }, [activity.id, activity.requirePayment, ticketOptionId, selectedEventDayIds, promoCode]);
  useEffect(() => {
    if (!activity.requirePayment) return;
    const timer = setTimeout(() => void refreshQuote(), 200);
    return () => { clearTimeout(timer); quoteRequest.current += 1; };
  }, [activity.requirePayment, refreshQuote]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (soldOut || busy.current || (activity.requirePayment && (!quoteLabel || quoting))) return;

    if (activity.requirePayment && isEvent && ticketOptions.length > 0 && !ticketOptionId) {
      setError("Select a ticket type.");
      return;
    }

    if (selectedTicket?.accessMode === "select_days") {
      const min = selectedTicket.minDays ?? 1;
      const max = selectedTicket.maxDays ?? min;
      if (selectedEventDayIds.length < min || selectedEventDayIds.length > max) {
        setError(`Select between ${min} and ${max} day(s) for this ticket.`);
        return;
      }
    }

    busy.current = true;
    setLoading(true);
    onPendingChange?.(true);
    setError(null);
    setAccountExists(false);

    try {
      trackClientEvent("class_checkout_started", {
        activity_id: activity.id,
        require_payment: activity.requirePayment,
        activity_kind: activity.kind,
      });

      let data: BookResponse;
      if (signedIn) {
        const result = await registerForActivity(activity.id, { ticketOptionId, selectedEventDayIds, promoCode });
        if (!result.ok) {
          setError(result.error);
          if (result.signIn) setAccountExists(true);
          return;
        }
        data = "enrolled" in result ? { enrolled: true, activityId: activity.id, activityTitle: result.activityTitle } : result;
      } else {
        if (activity.requirePayment) requireGuestReceiptStorage();
        data = await callSupabaseFunction<BookResponse>("web-guest-class-book", {
        classId: activity.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        dateOfBirth: dateOfBirth.trim(),
        ...(ticketOptionId
          ? isEvent && ticketOptions.length > 0
            ? { ticketOptionId, pricingTierId: ticketOptionId }
            : { pricingTierId: ticketOptionId }
          : {}),
        ...(selectedEventDayIds.length ? { selectedEventDayIds } : {}),
        ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {}),
      });

      }

      if ("checkoutUrl" in data && data.checkoutUrl) {
        if (!signedIn) saveGuestReceipt(data.sessionId, data.receiptToken ?? "");
        window.location.href = data.checkoutUrl;
        return;
      }

      if ("enrolled" in data && data.enrolled) {
        trackClientEvent("class_guest_enrolled", {
          activity_id: activity.id,
          require_payment: false,
          activity_kind: activity.kind,
        });
        try { sessionStorage.removeItem(draftKey); } catch { /* No persisted draft. */ }
        onEnrolled?.(data.activityTitle ?? activity.title);
        return;
      }

      setError("Something went wrong. Please try again.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const errorCode =
        err instanceof Error && "errorCode" in err && typeof err.errorCode === "string"
          ? err.errorCode
          : null;
      if (errorCode === "ACCOUNT_EXISTS" || message.toLowerCase().includes("already exists")) {
        setAccountExists(true);
        trackClientEvent("class_checkout_account_exists", { activity_id: activity.id });
      }
      setError(accountExists || errorCode === "ACCOUNT_EXISTS" ? "This email already has an account. Sign in to continue with your ticket choices." : message);
    } finally {
      busy.current = false;
      setLoading(false);
      onPendingChange?.(false);
    }
  }

  const submitLabel = soldOut
    ? "Sold out"
    : loading
      ? "Please wait…"
      : activity.requirePayment
        ? "Continue to payment"
        : "Reserve my spot";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!isModal ? (
        <div>
          <h2 className="casting-section-title">
            {activity.requirePayment ? `Get tickets` : `Book this ${noun}`}
          </h2>
          <p className="casting-body-copy" style={{ marginTop: 8 }}>
            {signedIn ? "Confirm your choices to" : "Enter your details to"} {activity.requirePayment ? "continue to payment" : "reserve your spot"}.
            You must be 18 or older.
          </p>
        </div>
      ) : (
        <p className="casting-body-copy">
          {signedIn ? "Confirm your choices to" : "Enter your details to"} {activity.requirePayment ? "continue to payment" : "reserve your spot"}.
          You must be 18 or older.
        </p>
      )}

      {signedIn ? <p className="casting-body-copy">Your reservation will use your signed-in Motiion account.</p> : <p className="casting-body-copy">Already have an account? <Link href={signInHref}>Sign in to continue</Link>. Your ticket choices will be kept.</p>}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {!signedIn ? <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FormField label="First name">
            <input
              className="public-review-field-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </FormField>
          <FormField label="Last name">
            <input
              className="public-review-field-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </FormField>
        </div>

        <FormField label="Email">
          <input
            className="public-review-field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Date of birth">
          <input
            className="public-review-field-input"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
        </FormField>

        </> : null}

        {showTicketPicker ? (
          <FormField label="Ticket">
            <select
              className="public-review-select"
              value={ticketOptionId ?? ""}
              onChange={(e) => {
                invalidateQuote();
                setTicketOptionId(e.target.value);
                setSelectedEventDayIds([]);
              }}
              required
            >
              {ticketOptions.length > 0
                ? ticketOptions.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticketLabel(activity, ticket)}
                    </option>
                  ))
                : tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} — {formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}
                    </option>
                  ))}
            </select>
          </FormField>
        ) : null}

        {selectedTicket?.accessMode === "select_days" && eventDays.length > 0 ? (
          <FormField group
            label={`Select days (${selectedTicket.minDays ?? 1}–${selectedTicket.maxDays ?? selectedTicket.minDays ?? 1})`}
          >
            <div style={{ display: "grid", gap: 8 }}>
              {eventDays.map((day) => {
                const checked = selectedEventDayIds.includes(day.id);
                const daySoldOut = day.spotsRemaining != null && day.spotsRemaining <= 0;
                return (
                  <label
                    key={day.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      opacity: daySoldOut ? 0.45 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={daySoldOut}
                      onChange={() => toggleDay(day.id)}
                    />
                    <span>
                      {day.label ? `${day.label} · ` : ""}{new Date(`${day.dayDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      {day.startTime ? ` · ${day.startTime.slice(0, 5)}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormField>
        ) : null}

        {selectedTicket?.accessMode === "fixed_days" &&
        selectedTicket.includedEventDayIds.length > 0 ? (
          <p className="casting-body-copy">
            Includes:{" "}
            {eventDays
              .filter((day) => selectedTicket.includedEventDayIds.includes(day.id))
              .map((day) => day.label || day.dayDate)
              .join(", ")}
          </p>
        ) : null}

        {activity.requirePayment ? (
          <FormField label="Promo code" controlId={`activity-promo-${activity.id}`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                className="public-review-field-input"
                id={`activity-promo-${activity.id}`}
                value={promoCode}
                onChange={(e) => { invalidateQuote(); setPromoCode(e.target.value.toUpperCase()); }}
                placeholder="Optional"
                autoComplete="off"
              />
              <button
                type="button"
                className="casting-page-cta casting-page-cta--secondary"
                onClick={() => void refreshQuote()}
                disabled={!promoCode.trim() || quoting || loading}
              >
                {quoting ? "Checking…" : "Apply"}
              </button>
            </div>

          </FormField>
        ) : null}

        {activity.requirePayment ? <div className="casting-glass-card" aria-live="polite">
          <p className="casting-body-copy">{quoting ? "Checking current ticket price and fees…" : quoteLabel ?? "Confirm your ticket choices to see the total before payment."}</p>
          {!quoting && !quoteLabel ? <button type="button" className="casting-modal-dismiss" disabled={loading} onClick={() => void refreshQuote()}>Retry price</button> : null}
        </div> : null}
        {error ? <p className="public-review-error" role="alert">{error}</p> : null}

        {accountExists ? (
          <Link href={signInHref} className="casting-btn-primary" style={{ textAlign: "center" }}>
            Sign in and continue
          </Link>
        ) : (
          <button
            type="submit"
            className="casting-submit-button"
            disabled={loading || soldOut || (activity.requirePayment && (quoting || !quoteLabel))}
            style={{ pointerEvents: "auto" }}
          >
            {submitLabel}
          </button>
        )}
      </form>
    </div>
  );
}

function FormField({ label, children, group = false, controlId }: { label: string; children: React.ReactNode; group?: boolean; controlId?: string }) {
  if (group) return <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 6 }}><legend className="public-review-field-label" style={{ marginBottom: 6 }}>{label}</legend>{children}</fieldset>;
  if (controlId) return <div style={{ display: "grid", gap: 6 }}><label htmlFor={controlId} className="public-review-field-label">{label}</label>{children}</div>;
  return <label style={{ display: "grid", gap: 6 }}><span className="public-review-field-label">{label}</span>{children}</label>;
}
