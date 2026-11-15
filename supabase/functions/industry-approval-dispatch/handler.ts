import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { approvalURL, emailBody, responseResult, type Delivery, type DeliveryResult } from "./delivery.ts";
type Dependencies = { db: SupabaseClient; env: (name: string) => string | undefined; send: typeof fetch; jwt: () => Promise<string>; baseURL: () => string };
export function createHandler({ db, env, send, jwt, baseURL }: Dependencies) { return async (req: Request) => {
  const secret = env("NOTIF_DISPATCH_SECRET")?.trim();
  if (!secret || req.headers.get("x-notif-dispatch-secret") !== secret) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { data: config, error: configError } = await db.from("industry_approval_delivery_config").select("email_enabled,push_enabled").single();
  if (configError) return new Response("Configuration unavailable", { status: 503 });
  let url = "";
  try {
    if (config.email_enabled) {
      url = approvalURL(env("INDUSTRY_APPROVAL_URL"));
      if (!env("RESEND_API_KEY")) throw new Error("Missing email provider");
    }
    if (config.push_enabled && (!env("APNS_BUNDLE_ID") || !env("APNS_TEAM_ID") || !env("APNS_KEY_ID") || !env("APNS_PRIVATE_KEY"))) throw new Error("Missing push provider");
  } catch { return new Response("Enabled channel is missing provider or destination configuration", { status: 503 }); }
  const { data, error } = await db.rpc("claim_industry_approval_deliveries", { p_limit: 5 });
  if (error) return new Response("Queue unavailable", { status: 503 });
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Delivery[]) {
    let result: DeliveryResult = "retry";
    let failure: string | null = null;
    try {
      const app = await db.from("industry_applications").select("status,version").eq("user_id", row.user_id).single();
      if (app.error) throw new Error("Application lookup failed");
      const event = row.event_kind ?? "approved"; // Compatibility with pre-migration queued approvals.
      if (!["approved", "needs_information", "submitted"].includes(event)
          || app.data.status !== (event === "submitted" ? "pending" : event) || app.data.version !== row.application_version
          || (event !== "approved" && row.channel !== "email")) result = "skipped";
      else if (row.channel === "email") {
        const user = await db.auth.admin.getUserById(row.user_id);
        if (user.error) throw new Error("Account lookup failed");
        if (user.data.user.email !== row.destination) result = "skipped";
        else {
          const response = await send("https://api.resend.com/emails", {
            method: "POST", signal: AbortSignal.timeout(15000),
            headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `industry-approval/${row.id}` },
            body: JSON.stringify(emailBody(row, url)),
          });
          result = responseResult(response.status);
          if (result !== "sent") failure = `Email provider HTTP ${response.status}`;
          await response.body?.cancel();
        }
      } else {
        const profile = await db.from("profiles").select("notifications_enabled").eq("user_id", row.user_id).single();
        const token = await db.from("device_tokens").select("id").eq("user_id", row.user_id).eq("apns_token", row.destination).maybeSingle();
        if (profile.error || token.error) throw new Error("Device lookup failed");
        if (!token.data || profile.data.notifications_enabled === false) result = "skipped";
        else {
          const response = await send(`${baseURL()}/3/device/${row.destination}`, {
            method: "POST", signal: AbortSignal.timeout(15000),
            headers: { authorization: `bearer ${await jwt()}`, "apns-topic": env("APNS_BUNDLE_ID")!, "apns-push-type": "alert", "apns-priority": "10", "apns-id": row.id, "apns-collapse-id": `industry-approval-${row.application_version}` },
            body: JSON.stringify({ aps: { alert: { title: "You’re approved", body: "Open Motiion to discover talent, cast talent, and manage your projects." }, sound: "default" }, motiion: { type: "industry_application_approved", notification_id: row.id, url: "motiion://industry/approved" } }),
          });
          result = responseResult(response.status);
          if (result !== "sent") failure = `Push provider HTTP ${response.status}`;
          await response.body?.cancel();
        }
      }
    } catch { failure = "Delivery interrupted; retry within provider idempotency window"; }
    const finished = await db.rpc("finish_industry_approval_delivery", { p_id: row.id, p_lease: row.lease_id, p_result: result, p_error: failure });
    if (finished.error) return new Response("Queue acknowledgement failed", { status: 503 });
    counts[result] = (counts[result] ?? 0) + 1;
  }
  return Response.json({ processed: data?.length ?? 0, counts });
}; }
