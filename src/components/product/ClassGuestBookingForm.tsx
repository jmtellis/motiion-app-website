"use client";

import { useState } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";
import { callSupabaseFunction } from "@/lib/supabaseRest";
import { formatMoney } from "@/lib/publicActivity";
import type { PublicActivity } from "@/types/public";

const SITE_HOME = "https://www.motiion.app";

type BookResponse =
  | { checkoutUrl: string; sessionId: string }
  | { enrolled: true; activityId: string; activityTitle?: string };

type Props = {
  activity: PublicActivity;
  onEnrolled?: (title: string) => void;
  variant?: "inline" | "modal";
};

export function ClassGuestBookingForm({ activity, onEnrolled, variant = "inline" }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [pricingTierId, setPricingTierId] = useState<string | null>(() => {
    const tiers = activity.pricingTiers ?? [];
    return tiers.length > 0 ? tiers[0].id : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const soldOut = activity.spotsRemaining != null && activity.spotsRemaining <= 0;
  const tiers = activity.pricingTiers ?? [];
  const showTierPicker = activity.requirePayment && tiers.length > 1;
  const isModal = variant === "modal";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (soldOut) return;

    setLoading(true);
    setError(null);
    setAccountExists(false);

    try {
      trackClientEvent("class_checkout_started", {
        activity_id: activity.id,
        require_payment: activity.requirePayment,
      });

      const data = await callSupabaseFunction<BookResponse>("web-guest-class-book", {
        classId: activity.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        dateOfBirth: dateOfBirth.trim(),
        ...(pricingTierId ? { pricingTierId } : {}),
      });

      if ("checkoutUrl" in data && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if ("enrolled" in data && data.enrolled) {
        trackClientEvent("class_guest_enrolled", {
          activity_id: activity.id,
          require_payment: false,
        });
        const params = new URLSearchParams({
          enrolled: "1",
          kind: "class",
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
          <h2 className="casting-section-title">Book this class</h2>
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

        {showTierPicker ? (
          <FormField label="Ticket">
            <select
              className="public-review-select"
              value={pricingTierId ?? ""}
              onChange={(e) => setPricingTierId(e.target.value)}
              required
            >
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label} — {formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}
                </option>
              ))}
            </select>
          </FormField>
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
    <label className="public-review-field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}
