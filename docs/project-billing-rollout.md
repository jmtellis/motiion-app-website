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

Staging mvkvztpvakybrhyupown has the three project billing migrations and revenuecat-webhook version 8. Production pygdxcscmebeqjxhzzuq received the same three billing migrations atomically as project_billing_production_rollout on 2026-11-14. Purchase storage and access RPC existence and denial of client-side purchase grants were verified. Live Stripe catalog and webhook configuration were completed on 2026-11-14. The production redeployment is READY. Signed-in Project Pass reached live Stripe Checkout; both monthly plans correctly blocked a duplicate subscription for the existing paid account.

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
6. Website live Stripe catalog, production environment, webhook, database migrations and deployment are complete. Apple/mobile release remains separate and pending the requirements above.

The optional $49 pass-extension advertisement was removed because no extension product or workflow exists. Pass access refresh currently relies on authenticated RevenueCat webhook delivery; the older sync-apple-subscription endpoint reconciles legacy products only. New-product purchase reconciliation during webhook outages remains a follow-up before a resilient production launch.

## Website production configuration — 2026-11-14

- Production database migration: `20261115031213_project_billing_production_rollout`, containing the three reviewed project billing migrations atomically. Historical remote migration versions were absent locally, so no migration-history repair or unrelated migrations were applied.
- Live Project Pass: `prod_VdAE4ga7B1Zdba` / `price_1UbtuMJefpu9FPzfv61RsU2K`, USD 199 one-time.
- Live Studio: `prod_VdAFDZdmZD0Uta` / `price_1UbtueJefpu9FPzfu6CdYfFx`, USD 149 monthly.
- Live Production House: `prod_VdAFdZKjjaADpn` / `price_1UbtuxJefpu9FPzfsFN0VfR6`, USD 499 monthly.
- Price IDs configured only for Vercel production. Existing secret keys and webhook signing secret preserved. User confirmed no current tax collection; automatic tax is not enabled.
- Existing live website webhook `we_1TugdHJefpu9FPzfwLYfpVBr` now subscribes to 14 events, preserving its 10 existing billing/identity events and adding checkout.session.async_payment_succeeded, charge.refunded, charge.dispute.created, radar.early_fraud_warning.created.
- Existing live billing portal permits payment-method updates, invoice history and cancellation at period end. Tier switching is not enabled in the portal.
- Production rebuild: `dpl_DrGAVENcd9zJjVRg9ALC8VzH3d3E`, source commit `70ca933963993b8c70cea078e92126cd66eb59d6`.

### Production verification

- Deployment READY and aliased to www.motiion.app and motiion.app.
- Signed-in Project Pass reached a cs_live Stripe Checkout showing USD 199 once. No payment was submitted.
- Studio and Production House displayed the correct monthly prices and refused duplicate monthly subscriptions for the signed-in existing subscriber. Their live checkout creation remains unverified with an unsubscribed industry account; all three completed in sandbox previously.
- Replayed an already-processed live checkout event after deployment: HTTP 200 with ok=true and duplicate=true, verifying the deployed webhook signature and deduplication path without creating a charge.
- No real purchase or new live entitlement grant was performed during verification.

## Project payment, team invitations and seats — 2026-11-15

Payment is required before creating any project, including private drafts. An active draft consumes a monthly slot or starts its assigned 90-day pass. Existing legacy paid Industry Pro access is preserved.

Team invites default to project admin. Owners enter an email, job title and access level; titles never grant permissions. Pending invitations reserve seats. Recipients verify the invited email and explicitly join; they do not need an independent plan, industry application or full talent portfolio. Admin access is scoped to that project. Only the owner can change team permissions and billing.

Coordinators use a separate membership table and curated RPCs. They can see the team and project schedule, and edit dates, times and locations for existing rehearsals/callbacks and class/session activities. They cannot read private project briefs, rates, contracts, casting decisions, or change team permissions through this surface. Schedule updates preserve audience targeting and other project metadata. Assigning groups and creating schedule items remain admin tasks.

Both website and iOS now have team invitation, resend/revoke, access changes, removal and schedule controls. Team projects are available from the account menu/Settings. Website signup and verified-email redirects preserve the invitation. iOS opens team invites before full portfolio onboarding. Existing talent/participant invitation behavior is retained.

### Seats and billing

- Project Pass and Studio include 3 seats; Production House includes 10. These totals include the owner. Admins, coordinators and legacy collaborators consume seats; talent does not.
- Monthly seats are shared across the owner's active monthly-plan projects; distinct people and pending email recipients count once. Active Project Pass projects have separate seat pools.
- Additional monthly seats cost USD 15 each. They attach to the existing website Studio/Production House subscription, show a prorated invoice preview, require explicit confirmation, and use pending updates so capacity increases only after payment succeeds.
- Additional Project Pass seats cost USD 39 each, paid once through Stripe Checkout. They expire with the existing project pass and never extend it.
- iOS opens the website for seat purchases and reads the same verified capacity. Monthly add-ons require a website-billed base subscription; Apple-billed monthly seat purchases and App Store release are not included.
- Live monthly price: `price_1UcAG3Jefpu9FPzfJESB0aIM`, lookup key `motiion_team_seat_monthly_v1`.
- Live pass seat price: `price_1UcAG3Jefpu9FPzfLZs79vHn`, lookup key `motiion_team_seat_pass_v1`.
- Production builds idempotently verify/provision this exact catalog using the existing protected Vercel billing credential. Runtime resolves the known lookup keys or optional STRIPE_TEAM_SEAT_*_PRICE_ID overrides. Keys never enter browser bundles or build output.
- Webhooks handle paid Checkout, subscription changes, renewal/failure/cancellation, refunds and disputes. Refunds revoke seats; a later monthly period can restore paid recurring seats. Project Pass refunds remain permanently revoked.
- No real customer charge was submitted during this release.

### Backend deployment and verification

Production Supabase project: `pygdxcscmebeqjxhzzuq`. Deployed application-submission receipts, payment-before-creation, team permissions/invitations/seat receipts, scoped industry guards, and legacy schedule preservation. industry-approval-dispatch v5 and project-team-dispatch v1 are ACTIVE. The team email cron is enabled and reuses the existing configured Resend sender and dispatcher secret. No historical application or team emails are backfilled.

The service-only email queue retries with leases and stable provider idempotency keys. It skips revoked, expired, accepted and rotated invitations. Recipient addresses are email-bound; application receipts use the authenticated account email. Provider delivery to a real recipient was not exercised during verification.

Validation: 19 focused website tests, 17 email-worker tests, website TypeScript/targeted ESLint, and both iOS simulator architectures passed. Isolated Postgres tests cover unpaid creation, pending-seat reservations, wrong-email rejection, idempotent acceptance, admin/coordinator separation, schedule privacy and metadata preservation, downgrade/removal, extra-seat grants/revocations and service-only billing privileges. Production grants and cron configuration were checked. Advisor notices for the three protected tables without public RLS policies and authenticated SECURITY DEFINER RPCs are intentional: table privileges are revoked and each public RPC checks live membership/ownership.

Website production build passed on Vercel; final domain promotion is recorded separately below. Existing Apple verification/review and broader post-expiry write-coverage limitations earlier in this document remain applicable.

### Final website release

Promoted `dpl_x4C6nXjqszzm2j7h9vq2HVbm3YXR` (`motiion-app-website-lz8pb4saq-motiion.vercel.app`) to production on 2026-11-15. Live pricing returned HTTP 200, signed-out team projects returned HTTP 307 preserving `/team-projects` in the login return path, and an invalid invitation rendered its safe unavailable state. Native build succeeded; no App Store/TestFlight submission was performed.
