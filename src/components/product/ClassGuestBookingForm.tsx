"use client";

import { useMemo, useState } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";
import { callSupabaseFunction } from "@/lib/supabaseRest";
import { formatMoney } from "@/lib/publicActivity";
import type { PublicActivity, PublicTicketOption } from "@/types/public";

const SITE_HOME = "https://www.motiion.app";

type BookResponse =
  | { checkoutUrl: string; sessionId: string }
  | { enrolled: true; activityId: string; activityTitle?: string };

type Props = {
  activity: PublicActivity;
  onEnrolled?: (title: string) => void;
  variant?: "inline" | "modal";
};

function ticketLabel(activity: PublicActivity, ticket: PublicTicketOption) {
  return `${ticket.label} — ${formatMoney(ticket.amountCents, ticket.currency || activity.priceCurrency || "usd")}`;
}

export function ClassGuestBookingForm({ activity, onEnrolled, variant = "inline" }: Props) {
  const ticketOptions = activity.ticketOptions ?? [];
  const eventDays = activity.eventDays ?? [];
  const tiers = activity.pricingTiers ?? [];
  const isEvent = activity.kind === "event";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ticketOptionId, setTicketOptionId] = useState<string | null>(() => {
    if (ticketOptions.length > 0) return ticketOptions[0].id;
    if (tiers.length > 0) return tiers[0].id;
    return null;
  });
  const [selectedEventDayIds, setSelectedEventDayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const selectedTicket = useMemo(
    () => ticketOptions.find((ticket) => ticket.id === ticketOptionId) ?? null,
    [ticketOptions, ticketOptionId],
  );

  const soldOut = activity.spotsRemaining != null && activity.spotsRemaining <= 0;
  const showTicketPicker =
    activity.requirePayment && (ticketOptions.length > 0 || tiers.length > 1);
  const isModal = variant === "modal";
  const noun =
    activity.kind === "event" ? "event" : activity.kind === "session" ? "session" : "class";

  function toggleDay(dayId: string) {
    setSelectedEventDayIds((current) =>
      current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (soldOut) return;

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

    setLoading(true);
    setError(null);
    setAccountExists(false);

    try {
      trackClientEvent("class_checkout_started", {
        activity_id: activity.id,
        require_payment: activity.requirePayment,
        activity_kind: activity.kind,
      });

      const data = await callSupabaseFunction<BookResponse>("web-guest-class-book", {
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
      });

      if ("checkoutUrl" in data && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if ("enrolled" in data && data.enrolled) {
        trackClientEvent("class_guest_enrolled", {
          activity_id: activity.id,
          require_payment: false,
          activity_kind: activity.kind,
        });
        onEnrolled?.(data.activityTitle ?? activity.title);
        const params = new URLSearchParams({
          enrolled: "1",
          kind: activity.kind,
          activity_id: activity.id,
          title: data.activityTitle ?? activity.title,
          email: email.trim(),
        });
        window.location.href = `/payments/success?${params.toString()}`;
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
      setError(message);
    } finally {
      setLoading(false);
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
            Enter your details to {activity.requirePayment ? "continue to payment" : "reserve your spot"}.
            You must be 18 or older.
          </p>
        </div>
      ) : (
        <p className="casting-body-copy">
          Enter your details to {activity.requirePayment ? "continue to payment" : "reserve your spot"}.
          You must be 18 or older.
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
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

        {showTicketPicker ? (
          <FormField label="Ticket">
            <select
              className="public-review-select"
              value={ticketOptionId ?? ""}
              onChange={(e) => {
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
          <FormField
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
                      {day.label || day.dayDate}
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

        {error ? <p className="public-review-error">{error}</p> : null}

        {accountExists ? (
          <a href={SITE_HOME} className="casting-btn-primary" style={{ textAlign: "center" }}>
            Open Motiion app
          </a>
        ) : (
          <button
            type="submit"
            className="casting-submit-button"
            disabled={loading || soldOut}
            style={{ pointerEvents: "auto" }}
          >
            {submitLabel}
          </button>
        )}
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="public-review-field-label">{label}</span>
      {children}
    </label>
  );
}
