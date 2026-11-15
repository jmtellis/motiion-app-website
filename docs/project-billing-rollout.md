# Project billing rollout — 2026-11-14

## Catalog

| Plan | USD price | Apple product | Apple ID | RevenueCat product |
| --- | --- | --- | --- | --- |
| Project Pass | $199 once | com.motiion.project.pass | 6834978301 | prod8379442007 |
| Studio | $149/month | com.motiion.studio.monthly | 6834979046 | prode784f75de8 |
| Production House | $499/month | com.motiion.productionhouse.monthly | 6834979880 | prod2f4f54fa71 |

Apple products are drafts (Prepare for Submission), with English US descriptions, USD prices and current-country availability. Monthly plans belong to existing group 22325752. Existing levels 1–3 are preserved; Production House is level 4 and Studio level 5. The user approved Production House above Studio for upgrade/downgrade behavior. No review submission or live release was performed.

RevenueCat project 6b581300, Apple app appc00d50908b: all three imported from Apple. Offering project_plans (ofrngb18e7386dc) contains custom packages project_pass, studio and production_house. studio_access (entl00f289d198) is attached to Studio; production_house_access (entl05775bdb96) is attached to Production House. Passes intentionally have no lifetime entitlement. Their transaction receipts and project assignments are the authoritative access record. Existing offerings and entitlement mappings are preserved.

Stripe TEST prices:
- STRIPE_PROJECT_PASS_PRICE_ID=price_1UbsjMJefpu9FPzf4EVeM3tM
- STRIPE_STUDIO_PRICE_ID=price_1UbsjNJefpu9FPzf71TiZAvq
- STRIPE_PRODUCTION_HOUSE_PRICE_ID=price_1UbsjOJefpu9FPzfVGYyVvH5

## Implemented

Website checkout uses configured Stripe prices, verified ownership and signed webhooks. Settings show shared purchases and monthly capacity. The iOS industry purchase screen fetches all three Apple products and purchases through RevenueCat after matching its user identity to Supabase. Both clients read account_project_access. Account access is granted by verified server receipts, not client entitlement claims.

Database migrations add protected purchase records, per-owner project capacity locks, pass assignment for 90 days when monthly capacity is exhausted, and team limits. Existing verified paid Industry Pro accounts retain legacy capacity. A deleted/archived project does not recycle its pass. Monthly limits are 1 and 5 active projects; team limits are 3 and 10 including the owner.

Staging mvkvztpvakybrhyupown has the three project billing migrations and revenuecat-webhook version 8. Production pygdxcscmebeqjxhzzuq has not been migrated or deployed in this change.

## Validation completed

- iOS simulator xcodebuild succeeded (both architectures).
- Website TypeScript check passed.
- 23 billing regression tests passed.
- Transactional database capacity fixture passed on staging, including overflow pass allocation, slot reuse, limits and refund replay.
- Direct permission checks confirm anonymous users cannot call account_pro_status and authenticated clients cannot grant or insert purchases.
- Apple and RevenueCat draft catalog setup verified in their dashboards.

## Sandbox validation update

- Authenticated, sandbox-only RevenueCat webhook configured for staging; its test event returned HTTP 200. Missing authorization returns 401 and production events are rejected by staging.
- All three Stripe test checkouts completed. Signed webhook delivery and authenticated account access were verified. Project Pass allowed one project, Studio one active project, and Production House five; excess projects were rejected and purchase records remained isolated by account.
- A declined Production House payment granted no access. Studio cancellation at period end retained access through the paid expiry.
- A staging-connected physical iPhone build succeeded and was installed. Apple products loaded and the payment sheet opened, but Apple rejected the sandbox purchase with an account authorization error. The user chose to stop troubleshooting the tester. Successful Apple purchase delivery and access remain UNVERIFIED.
- Repeat-pass checkout idempotency was corrected after testing. Repeated purchases, refunds, renewals, restore and subscription upgrades still need end-to-end verification.

## Required before release

1. Review environment isolation for the existing production RevenueCat webhook whintgrfed878d951, which still receives both environments. The additional staging webhook is sandbox-only. Do not send test purchase grants to production.
2. Preserve environment separation. Tests used an isolated staging website configuration and a staging mobile build. The original local website escape-hatch configuration remains unchanged; new checkout blocks staging labels pointing at production.
3. Complete the outstanding Apple purchase verification and lifecycle tests noted above before declaring the purchase flow launch-ready. Automated tests and a successful payment-sheet presentation are not end-to-end Apple purchase verification.
4. Confirm full project write coverage for expired/archived projects: current capacity triggers guard projects and roles, plus team additions; they do not yet impose read-only behavior on every schedule/message/related table.
5. Add Apple review screenshots and submit the consumable with an app version, then obtain review approval. Products are not live.
6. Provision LIVE Stripe products, configure production environment variables/webhook, apply reviewed database migrations and deploy backend/website/mobile release together.

The optional $49 pass-extension advertisement was removed because no extension product or workflow exists. Pass access refresh currently relies on authenticated RevenueCat webhook delivery; the older sync-apple-subscription endpoint reconciles legacy products only. New-product purchase reconciliation during webhook outages remains a follow-up before a resilient production launch.
