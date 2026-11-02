# Independent billing contract review — 2026-11-02

Reviewed `20261102161127_stripe_verified_entitlements.sql`, Stripe checkout, success reconciliation, signed webhook, subscription normalization, and shared entitlement reads. Production inspection was read-only. No production migration, account, price, or policy was changed by this review.

Current offer follow-up: website Checkout now matches the intended app offer at **$59.99 USD/month**, without a new trial. Server-owned `STRIPE_INDUSTRY_LEGACY_PRICE_IDS` preserves verified historical Industry purchases during catalog rotation; it cannot sell a legacy price in new Checkout. Actual new TEST payment and existing legacy entitlement both passed. See [production preflight](production-billing-preflight.md) for exact remaining live-price, webhook, and orphan-subscription reconciliation limits. Earlier trial evidence below is historical baseline, not the current offer.

## Compatibility and authorization

Production `account_pro_status(uuid)` was compared directly with the proposed replacement. Existing talent, industry, dual, community and legacy Apple SKU lists are identical. The trusted Apple helper and its three-minute grace remain unchanged, as do plan-specific access-code grants. JSON keys/types remain `talent`, `industry`, `community` booleans; this is the current iOS `AccountProStatus` / `BillingService` contract. The addition recognizes only server-verified, finite, active/trialing Stripe `industry_pro`, without unlocking Talent or Community.

Production subscriptions have own-row SELECT RLS and no client mutation policy. Stripe webhook event rows are service-only. The new synchronization RPC explicitly revokes public/anonymous/authenticated execution and grants only service role. It serializes writes per user, records events atomically, rejects stale provider event timestamps and prevents an older subscription's cancellation from revoking its active replacement. Stripe customer links are service-only.

Read-only production inventory at review time: exactly two `provider=stripe` rows; both canceled and `provider_verified=false` (one historical row has Apple billing source). No active/trialing Stripe database row needed grandfathering in that snapshot. Later direct Stripe inventory found one active legacy-price subscription whose metadata user no longer exists in Auth; it remains unresolved and was neither canceled nor assigned to another account. Recheck immediately before production rollout; never infer entitlement from legacy `tier=pro` or blanket-backfill verification.

The existing `account_pro_status` execute grants include anon/authenticated/service_role; the additive migration preserves them. This review does not broaden or restrict that existing public boolean-status contract.

## Edge cases corrected during review

- Missing configured Industry price now fails synchronization so Stripe retries; it no longer acknowledges and discards a signed subscription event.
- A previously verified Industry subscription whose eligible price is removed now clears its entitled period, immediately revoking Industry access while preserving its actual Stripe status. Unrelated subscriptions cannot create an entitlement; restoring the eligible price restores only its verified finite period.

Changes are in `subscription-state.ts` and `sync-subscription.ts`; no additional schema or access-policy change was needed. Four behavior tests cover these cases.

## Validation

- `scripts/industry-billing.test.ts` plus `scripts/account-subscription-check.test.ts`: 18 passed.
- Targeted ESLint and TypeScript passed after the review fixes.
- Main task separately performed real Stripe TEST Checkout, trial verification, signed webhook/replay/order checks, ownership rejection and Customer Portal checks; see its private `billing-verification-results.json` evidence and final integration record. This review's added price-removal cases were automated logic tests, not a real Stripe plan mutation.

## Release constraints

Apply the reviewed additive migration before the new web code reads `plan_entitlement` or invokes the synchronization RPC. Reconcile the shared migration ledger; do not replay unrelated iOS migrations. Configure the correct live Industry recurring price and signed webhook endpoint for production. A future price rotation needs an explicit policy for existing subscriptions; changing a single configured price silently is not a plan migration. Production deployment and its access impact remain the main task's explicit approval step.
