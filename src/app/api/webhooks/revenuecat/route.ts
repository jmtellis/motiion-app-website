import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RevenueCat webhook not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = payload as {
    event?: {
      app_user_id?: string;
      type?: string;
      entitlement_ids?: string[];
      expiration_at_ms?: number;
    };
  };

  const userId = event.event?.app_user_id;
  if (!userId) return NextResponse.json({ ok: true, skipped: true });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase admin not configured" }, { status: 503 });

  const active = event.event?.type !== "EXPIRATION";
  const periodEnd = event.event?.expiration_at_ms
    ? new Date(event.event.expiration_at_ms).toISOString()
    : null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "revenuecat",
      billing_source: "revenuecat",
      status: active ? "active" : "canceled",
      tier: active ? "pro" : "free",
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );

  return NextResponse.json({ ok: true });
}
