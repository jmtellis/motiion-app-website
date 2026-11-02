export function isActiveEnrollment(status: string | null | undefined): boolean {
  return ["paid", "guest", "comped"].includes(status?.toLowerCase() ?? "");
}

export type ActivityCheckoutSelection = {
  ticketOptionId?: string | null;
  selectedEventDayIds?: string[];
  promoCode?: string;
};

/** Persist ticket choices only, never guest email, birth date, or session data. */
export function normalizeActivityCheckoutSelection(raw: unknown): ActivityCheckoutSelection {
  const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    ticketOptionId: typeof row.ticketOptionId === "string" ? row.ticketOptionId.slice(0, 100) : null,
    selectedEventDayIds: Array.isArray(row.selectedEventDayIds)
      ? [...new Set(row.selectedEventDayIds.filter((id): id is string => typeof id === "string" && /^[\da-f-]{36}$/i.test(id)))].slice(0, 100) : [],
    promoCode: typeof row.promoCode === "string" ? row.promoCode.trim().slice(0, 64) : "",
  };
}

export type ActivityPaymentState = "confirmed" | "pending" | "failed" | "unverified";
export function activityPaymentState(status: string | null | undefined): ActivityPaymentState {
  const normalized = status?.trim().toLowerCase();
  // "complete" describes Checkout navigation, not necessarily settled payment.
  if (normalized === "succeeded" || normalized === "paid") return "confirmed";
  if (["expired", "failed", "cancelled", "canceled", "refunded"].includes(normalized ?? "")) return "failed";
  return normalized === "pending" ? "pending" : "unverified";
}

export function activityRegistrationError(message: string): string {
  const messages: Record<string, string> = {
    activity_full: "This activity is full. Refresh the details for the latest availability.",
    reserved_for_waitlist: "This spot is reserved for the waitlist. Check your Inbox for an offer before trying again.",
    activity_not_open_for_free_registration: "Free registration is no longer available. Refresh the activity for current tickets and access.",
    activity_unavailable: "This activity is unavailable to your account.",
    account_unavailable: "Your account cannot register for this activity.",
    already_organizer: "You already manage this activity and do not need an attendee reservation.",
  };
  return messages[message] ?? message;
}
