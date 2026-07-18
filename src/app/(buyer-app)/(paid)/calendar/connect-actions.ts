"use server";

import { callSupabaseFunctionAsUser } from "@/lib/supabaseRest";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ConnectAccountStatus } from "@/lib/talent-buyers/activities/types";

async function requireAccessToken(): Promise<
  { ok: true; accessToken: string } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) return { ok: false, error: "You need to be signed in." };
  return { ok: true, accessToken };
}

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://www.motiion.app";
  return raw.replace(/\/$/, "");
}

export async function fetchConnectAccountStatus(): Promise<{
  ok: boolean;
  status?: ConnectAccountStatus;
  error?: string;
}> {
  const auth = await requireAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const data = await callSupabaseFunctionAsUser<ConnectAccountStatus>(
      "connect-account-status",
      {},
      auth.accessToken,
    );
    return {
      ok: true,
      status: {
        hasConnectAccount: Boolean(data.hasConnectAccount),
        isReadyToAcceptPayments: Boolean(data.isReadyToAcceptPayments),
        detailsSubmitted: Boolean(data.detailsSubmitted),
        chargesEnabled: Boolean(data.chargesEnabled),
        payoutsEnabled: Boolean(data.payoutsEnabled),
        connectAccountId: data.connectAccountId ?? null,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not load payment status.",
    };
  }
}

export async function startStripeConnectOnboarding(): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  const auth = await requireAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const origin = siteOrigin();
  const returnUrl = `${origin}/dashboard/settings?connect=return`;
  const refreshUrl = `${origin}/dashboard/settings?connect=refresh`;

  try {
    await callSupabaseFunctionAsUser<{ connectAccountId?: string }>(
      "connect-create-account",
      {},
      auth.accessToken,
    );

    const link = await callSupabaseFunctionAsUser<{ url?: string; onboardingUrl?: string }>(
      "connect-create-account-link",
      { returnUrl, refreshUrl },
      auth.accessToken,
    );

    const url = link.url ?? link.onboardingUrl;
    if (!url) return { ok: false, error: "Could not start Stripe onboarding." };
    return { ok: true, url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not start Stripe onboarding.",
    };
  }
}
