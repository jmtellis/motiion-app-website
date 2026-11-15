// Only call with a server-authenticated RevenueCat payload.
export const PROJECT_APPLE_PLANS: Record<string,string> = {
 "com.motiion.project.pass":"project_pass",
 "com.motiion.studio.monthly":"studio",
 "com.motiion.productionhouse.monthly":"production_house",
};
export function projectPurchaseCall(event: Record<string,unknown>) {
 const product=String(event.product_id);
 if (!Object.hasOwn(PROJECT_APPLE_PLANS,product)) return null;
 const plan=PROJECT_APPLE_PLANS[product];
 const user=String(event.app_user_id ?? "");
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user)) throw new Error("Invalid purchase owner");
 const transaction=plan === "project_pass" ? event.transaction_id : event.original_transaction_id;
 if (typeof transaction !== "string" || !transaction) throw new Error("Missing transaction identifier");
 const type=String(event.type);
 const revoke=type === "EXPIRATION" || type === "SUBSCRIPTION_PAUSED" || (type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT");
 if (!["INITIAL_PURCHASE","RENEWAL","NON_RENEWING_PURCHASE","UNCANCELLATION","PRODUCT_CHANGE","SUBSCRIPTION_EXTENDED","CANCELLATION","BILLING_ISSUE","EXPIRATION","SUBSCRIPTION_PAUSED"].includes(type)) return null;
 if (typeof event.event_timestamp_ms !== "number") throw new Error("Missing event time");
 const expires=plan === "project_pass" ? null : typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms).toISOString() : null;
 if (plan !== "project_pass" && !expires) throw new Error("Missing subscription expiry");
 return {p_user_id:user,p_provider:"apple_iap",p_external_id:transaction,p_plan:plan,
 p_status:revoke ? (plan === "project_pass" ? "revoked":"inactive") : "active",p_expires_at:expires,p_event_at:new Date(event.event_timestamp_ms).toISOString()};
}
