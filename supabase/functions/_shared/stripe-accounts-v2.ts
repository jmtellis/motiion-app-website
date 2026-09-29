import { env } from "./env.ts";
import { supabaseAdmin } from "./supabase-admin.ts";

/**
 * Stripe Accounts v2 (booking payout recipients) over raw HTTPS.
 *
 * The shared `stripe` client pins apiVersion 2024-06-20 for class checkout; v2 endpoints need a
 * current version, so these calls send their own `Stripe-Version` and never touch class Connect
 * (`profiles.stripe_connect_account_id`, Accounts v1 Express + card_payments).
 */
const API_VERSION = Deno.env.get("STRIPE_ACCOUNTS_V2_API_VERSION")?.trim() || "2026-08-26.dahlia";
const STRIPE_API = "https://api.stripe.com";

export type CapabilityStatus = "active" | "pending" | "restricted" | "unsupported";

export type V2Account = {
  id: string;
  object?: string;
  dashboard?: string | null;
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: CapabilityStatus; requested?: boolean } | null;
          payouts?: { status?: CapabilityStatus; requested?: boolean } | null;
        } | null;
      } | null;
    } | null;
  } | null;
  requirements?: {
    entries?: Array<{
      minimum_deadline?: { status?: string } | null;
      awaiting_action_from?: string | null;
    }> | null;
  } | null;
};

export class StripeV2Error extends Error {
  constructor(readonly status: number, readonly code: string | null, message: string) {
    super(message);
  }
}

async function v2Request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.stripeSecretKey}`,
    "Stripe-Version": API_VERSION,
  };
  if (body) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const err = (json.error ?? {}) as { code?: string; message?: string };
    throw new StripeV2Error(res.status, err.code ?? null, err.message ?? `Stripe ${path} failed (${res.status})`);
  }
  return json as T;
}

const ACCOUNT_INCLUDE = ["configuration.recipient", "requirements", "identity"];

export async function createRecipientAccount(input: {
  userId: string;
  email: string | null;
  displayName: string | null;
}): Promise<V2Account> {
  return await v2Request<V2Account>(
    "POST",
    "/v2/core/accounts",
    {
      ...(input.email ? { contact_email: input.email } : {}),
      ...(input.displayName ? { display_name: input.displayName } : {}),
      dashboard: "express",
      identity: { country: "US", entity_type: "individual" },
      defaults: {
        currency: "usd",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      include: ACCOUNT_INCLUDE,
      metadata: { supabase_user_id: input.userId, motiion_purpose: "booking_payout_recipient" },
    },
    `booking-recipient:${input.userId}`,
  );
}

export async function retrieveAccount(accountId: string): Promise<V2Account> {
  const query = ACCOUNT_INCLUDE.map((value) => `include=${encodeURIComponent(value)}`).join("&");
  return await v2Request<V2Account>("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}?${query}`);
}

export async function createAccountLink(input: {
  accountId: string;
  type: "account_onboarding" | "account_update";
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string; expires_at?: string }> {
  return await v2Request("POST", "/v2/core/account_links", {
    account: input.accountId,
    use_case: {
      type: input.type,
      [input.type]: {
        configurations: ["recipient"],
        return_url: input.returnUrl,
        refresh_url: input.refreshUrl,
      },
    },
  });
}

export type RecipientStatus = {
  transfersStatus: CapabilityStatus;
  payoutsStatus: CapabilityStatus | null;
  currentlyDue: number;
  pastDue: number;
};

export function recipientStatus(account: V2Account): RecipientStatus {
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
  const entries = account.requirements?.entries ?? [];
  const pastDue = entries.filter((e) => e.minimum_deadline?.status === "past_due").length;
  const currentlyDue = entries.filter((e) => e.minimum_deadline?.status === "currently_due").length;
  return {
    transfersStatus: balance?.stripe_transfers?.status ?? "pending",
    payoutsStatus: balance?.payouts?.status ?? null,
    currentlyDue,
    pastDue,
  };
}

export type PayoutAccountRow = {
  user_id: string;
  stripe_account_id: string;
  stripe_transfers_status: CapabilityStatus;
  payouts_status: CapabilityStatus | null;
  requirements_currently_due: number;
  requirements_past_due: number;
  last_synced_at: string | null;
};

export async function loadPayoutAccountByUser(userId: string): Promise<PayoutAccountRow | null> {
  const { data, error } = await supabaseAdmin
    .from("booking_payout_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<PayoutAccountRow>();
  if (error) throw error;
  return data;
}

export async function savePayoutStatus(userId: string, accountId: string, status: RecipientStatus) {
  const { data, error } = await supabaseAdmin
    .from("booking_payout_accounts")
    .upsert(
      {
        user_id: userId,
        stripe_account_id: accountId,
        stripe_transfers_status: status.transfersStatus,
        payouts_status: status.payoutsStatus,
        requirements_currently_due: status.currentlyDue,
        requirements_past_due: status.pastDue,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single<PayoutAccountRow>();
  if (error) throw error;
  return data;
}

/** Re-sync a booking recipient from Stripe. Ignores accounts that are not booking recipients. */
export async function syncPayoutAccountById(accountId: string): Promise<PayoutAccountRow | null> {
  const { data, error } = await supabaseAdmin
    .from("booking_payout_accounts")
    .select("user_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle<{ user_id: string }>();
  if (error) throw error;
  if (!data) return null;
  const account = await retrieveAccount(accountId);
  return await savePayoutStatus(data.user_id, accountId, recipientStatus(account));
}
