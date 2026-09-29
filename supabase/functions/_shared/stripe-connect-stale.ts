import Stripe from "npm:stripe";

/**
 * True when `profiles.stripe_connect_account_id` should be discarded: wrong Stripe platform key
 * (e.g. rotated secret / test vs live), deleted account, Connect account not on this platform,
 * or **application access revoked** (`account_invalid` / permission errors from `accounts.retrieve`).
 * Do not treat auth failures or transient API errors as stale.
 */
export function stripeConnectStoredReferenceIsBroken(err: unknown): boolean {
  if (err instanceof Stripe.errors.StripeError) {
    if (err.type === "StripeAuthenticationError") return false;
    if (err.type === "StripeAPIError") return false;

    if (err.code === "resource_missing") return true;
    if (err.code === "account_invalid") return true;

    if (err.type === "StripePermissionError") {
      const msg = (err.message ?? "").toLowerCase();
      if (msg.includes("does not have access to account")) return true;
      if (msg.includes("application access may have been revoked")) return true;
    }

    if (err.type === "StripeInvalidRequestError") {
      const msg = (err.message ?? "").toLowerCase();
      if (msg.includes("no such account")) return true;
      if (msg.includes("not connected to your platform")) return true;
      if (msg.includes("similar object exists in")) return true;
      if (msg.includes("cannot be accessed with your api key")) return true;
      if (msg.includes("does not exist or was created in a different mode")) return true;
    }

    return false;
  }

  if (err == null || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "resource_missing") return true;
  if (e.code === "account_invalid") return true;
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("does not have access to account")) return true;
  if (msg.includes("application access may have been revoked")) return true;
  if (msg.includes("no such account")) return true;
  if (msg.includes("not connected to your platform")) return true;
  if (msg.includes("similar object exists in")) return true;
  if (msg.includes("cannot be accessed with your api key")) return true;
  if (msg.includes("does not exist or was created in a different mode")) return true;
  return false;
}
