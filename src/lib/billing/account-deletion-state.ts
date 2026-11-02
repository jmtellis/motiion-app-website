export type DeletionSubscription = {
  status: string;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
};

/** Delinquent/pending plans can still collect money even with a future cancellation. */
export function subscriptionPreventsAccountDeletion(subscription: DeletionSubscription): boolean {
  if (["canceled", "incomplete_expired"].includes(subscription.status)) return false;
  if (["active", "trialing", "paused"].includes(subscription.status)) {
    return !subscription.cancel_at_period_end && !subscription.cancel_at;
  }
  return true;
}

export type AccountDeletionResult = { ok: true } | { ok: false; error: string; billingRequired?: boolean };
