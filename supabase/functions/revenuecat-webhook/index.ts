import { projectPurchaseCall } from "../_shared/project-purchases.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import {
  authorizationMatches,
  decideRevenueCatWebhook,
  type ApplyVerifiedSubscriptionCall,
} from "./parse.ts";

function webhookSecret(): string | null {
  return Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION")?.trim() || null;
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function applyCall(
  client: ReturnType<typeof createClient>,
  call: ApplyVerifiedSubscriptionCall,
): Promise<string> {
  const { data, error } = await client.rpc("apply_verified_apple_iap_subscription", {
    p_user_id: call.userId,
    p_event_id: call.eventId,
    p_event_at: call.eventAtIso,
    p_event_type: call.eventType,
    p_status: call.status,
    p_current_period_start: call.periodStartIso,
    p_current_period_end: call.periodEndIso,
    p_app_store_product_id: call.productId,
    p_cancel_at_period_end: call.cancelAtPeriodEnd,
  });

  if (error) {
    throw error;
  }
  return typeof data === "string" ? data : "applied";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = webhookSecret();
  if (!secret) {
    console.error("revenuecat-webhook missing REVENUECAT_WEBHOOK_AUTHORIZATION");
    return jsonResponse({ error: "Webhook is not configured" }, 503);
  }

  if (!authorizationMatches(req.headers.get("authorization"), secret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    const event = (payload as {event?:Record<string,unknown>})?.event;
    if (event) {
      const call = projectPurchaseCall(event);
      if (call) {
        const expected = Deno.env.get("REVENUECAT_ENVIRONMENT") ?? ((Deno.env.get("SUPABASE_URL") ?? "").includes("pygdxcscmebeqjxhzzuq") ? "PRODUCTION" : "SANDBOX");
        if (event.environment !== expected || event.store !== "APP_STORE") return jsonResponse({error:"Purchase environment mismatch"},400);
        const {error} = await adminClient().rpc("sync_project_purchase",call);
        if (error) throw error;
        return jsonResponse({ok:true,outcome:"project_purchase_synced"});
      }
    }
  } catch { return jsonResponse({error:"Project purchase could not be saved"},500); }

  const decision = decideRevenueCatWebhook(payload);
  if (!decision.ok) {
    return jsonResponse({ error: decision.error }, 400);
  }

  if (decision.calls.length === 0) {
    return jsonResponse({ ok: true, outcome: decision.skipReason ?? "ignored" }, 200);
  }

  try {
    const client = adminClient();
    const outcomes: string[] = [];
    for (const call of decision.calls) {
      outcomes.push(await applyCall(client, call));
    }
    return jsonResponse({ ok: true, outcomes }, 200);
  } catch (error) {
    console.error("revenuecat-webhook apply failed", error);
    return jsonResponse({ error: "Apply failed" }, 500);
  }
});
