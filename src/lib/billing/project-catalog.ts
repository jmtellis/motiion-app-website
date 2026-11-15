export const PROJECT_CATALOG = {
  project_pass: { name: "Project Pass", amount: 19900, mode: "payment", priceEnv: "STRIPE_PROJECT_PASS_PRICE_ID", appleId: "com.motiion.project.pass" },
  studio: { name: "Studio", amount: 14900, mode: "subscription", priceEnv: "STRIPE_STUDIO_PRICE_ID", appleId: "com.motiion.studio.monthly" },
  production_house: { name: "Production House", amount: 49900, mode: "subscription", priceEnv: "STRIPE_PRODUCTION_HOUSE_PRICE_ID", appleId: "com.motiion.productionhouse.monthly" },
} as const;
export type ProjectPlan = keyof typeof PROJECT_CATALOG;
export function isProjectPlan(value: unknown): value is ProjectPlan {
  return typeof value === "string" && Object.hasOwn(PROJECT_CATALOG, value);
}
export type ProjectReceipt = { id: string; plan: ProjectPlan; provider: "stripe" | "apple_iap"; status: string; expires_at: string | null; project_id: string | null; activated_at: string | null };
export type ProjectAccess = { monthly_limit: number; active_projects: number; legacy: boolean; purchases: ProjectReceipt[] };
export function receiptIsActive(receipt: ProjectReceipt, now = Date.now()) {
  return receipt.status === "active" && (receipt.expires_at ? Date.parse(receipt.expires_at) > now : receipt.plan === "project_pass" && !receipt.activated_at);
}
