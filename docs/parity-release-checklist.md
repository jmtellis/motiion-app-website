# Production release approval manifest

Prepared 2 November 2026. This is the concrete release boundary, not authorization to deploy. Production inspection was read-only; the website and shared backend changes remain unreleased. The [domain matrix](parity-delivery.md), [browser acceptance](parity-browser-acceptance.md), [SQL review and rollback impact](parity-release-review.md), and [activity matrix](parity-activities.md), [continuation checkpoint](parity-continuation.md), and [live billing preflight](production-billing-preflight.md) contain supporting evidence.

## Target and current release

| Item | Verified current value |
| --- | --- |
| Website repository / branch | `jmtellis/motiion-app-website`, local `main` |
| Website baseline / current production commit | `c084894d0f0cc1d240231d09d76a2099a2bd5c09` |
| Vercel project | `motiion-app-website` / `prj_rgsXot0osCn7iH6MYpnxrPWqqArA` |
| Vercel team | `team_GgBckfXeHQE2Qz77R6mLuog8` |
| Current production deployment | `dpl_GUd6HY4Y6AnXbXdax3FideKNihzX`, READY, Git `main`, Node `24.x`, region `iad1` |
| Intended domain | `https://www.motiion.app`; current aliases also include `motiion.app` |
| Production Supabase | `pygdxcscmebeqjxhzzuq` / custom API host `api.motiion.app` |
| Test Supabase, excluded from production configuration | `mvkvztpvakybrhyupown` |
| Shared Edge source repository / baseline | `jmtellis/motiion-app-ios`, `main`, `604ccd28beeb0af5995ca12bd02dc196c0811a76` |
| Release commit | Website `56301d2515b6167ebf748617f60eaa536a00e9d0` (plus this documentation-only SHA record); shared Edge `5e2bdf119078d31560b83bc9de7bc4530b41ae7f`. Local `main` only; not pushed or deployed. |

Vercel project/deployment metadata was retrieved through the connected integration. Secret metadata was inspected without exporting values. Presence of a protected variable is not proof of its correctness or environment.

## Database changes requiring production approval

Apply these nine exact source files in order, after reconciling hosted migration names and content. No broad `db push`, unrelated historical migration replay, automatic account approval, or consent backfill is included. The first eight have individual access-impact and recovery notes in [the SQL review](parity-release-review.md); the ninth supplies authenticated free class/event registration.

| File under `supabase/migrations/` | Intended production change |
| --- | --- |
| `20261102155048_atomic_casting_finalization.sql` | Atomic owner/admin finalization, approved submission validation, expected-selection conflict protection, and project People membership. |
| `20261102161127_stripe_verified_entitlements.sql` | Trusted Stripe customer/price/event proof and finite Industry entitlement; preserve Apple/grants and native response shape. |
| `20261102164347_protect_shared_identity_status.sql` | Prevent ordinary profile writes from changing trusted identity results; preserve service synchronization. |
| `20261102170100_authorize_library_member_hydration.sql` | Scope private card hydration to self, trusted service or genuine applicant context; saved collection membership is not private-profile permission. |
| `20261102171214_allow_coordination_conflict_audit_event.sql` | Permit the already-emitted `conflict_detected` audit action without deleting historical events. |
| `20261102172156_respect_professional_profile_privacy.sql` | Restrictive direct-table profile read guard honoring canonical privacy and moderation. |
| `20261102173901_restrict_casting_candidate_writes_to_operators.sql` | Keep viewer/member reads, restrict candidate writes to approved owner/admin. |
| `20261102181221_preserve_submission_identity.sql` | Capture actual submitter, protect identity/provenance, prevent automatic private snapshots for operator-created selections, require applicant origin for private/contact enrichment. |
| `20261102182825_reserve_free_activity.sql` | Authenticated free registration with activity/organizer visibility, blocks, capacity, waitlist precedence, free-ticket checks, event-day entitlements and idempotent re-enrollment. |

The provenance column is a **required deployment dependency** for website contact/profile reads. Existing submissions retain their historical snapshots and NULL origin; no inferred authorship is backfilled. The read-only production snapshot contained 18 legacy submissions, all currently public/active, eight verified professional projections with none private/moderated, and one admin project member with no non-admin members. Recheck these counts immediately before applying the reviewed access changes. Existing native owner selections remain valid but do not authorize private profile/contact enrichment.

Hosted staging version numbers sometimes differ from repository timestamps. Staging correction versions are documented in the domain records; apply each final consolidated file only once to production. Production's latest inspected migration was `20261102025743_confirmations_owner_validation`; none of these nine release changes was present.

### Already-production migrations used only to catch staging up

Do **not** deploy these again: native role-scoped submission visibility, owner insert/returning privacy, role submission options, account-linked casting submissions, project controls/explicit confirmations, enabling confirmations during handoff, confirmations owner validation, and multi-role shortlist vote validation. Hosted production versions include `20261101224134`, `20261101233156`, `20261101233608`, `20261102024235`, `20261102021946`, `20261102022212`, `20261102025743`, and `20261102004259`. Match content and names, not only local file timestamps. `shortlist-share-public` v32 is also already production; staging was updated to that exact existing bundle, with no new production function required for this feature.

## Shared Edge function package

Class/event checkout is retained billing scope. Its implementation lives in the iOS repository's `Supabase/functions/`, not the website's older duplicate Edge tree. Publish the reviewed, complete dependency closures from the shared repository. Do not mix old website `_shared` files into those bundles.

The production bundle comparison found that `stripe-webhook` v50 contains multi-secret verification, Connect/thin-event handling and historical booking event processing missing from the local iOS base. Those branches and five deployed dependencies were restored exactly before adding the class settlement/retry fixes. This preserves existing backend processing; it does not recreate booking contract/payment controls or authorize new historical endpoint deployments. Source comparison and configuration evidence are private under `.staging/production-edge-*`.

The intended class package includes the following existing endpoints, with their current production versions recorded for recovery:

| Edge function | Current production version | Release purpose |
| --- | --- | --- |
| `payments-create-checkout-session` | 49 | Correct finite fee configuration, class/event web return, checked ticket reads and provider-backed checkout reuse/replacement. |
| `payments-checkout-quote` | 12 | Match the same configured fee contract as checkout. |
| `web-guest-class-book` | 20 | Shared class/guest pricing, return and fulfillment consistency. |
| `stripe-webhook` | 50 | Paid/zero-total fulfillment; provider-confirmed refund settlement and failed refunds; retryable database failures; separate activity signing scope while preserving historical/Connect handlers. |
| `web-checkout-status` | 15 | Owner-authenticated detail/reconciliation; exact-session signed guest receipt returns only status with no contact/activity data or public reconciliation. |
| `payments-reconcile-checkout` | 38 | Matching paid-state/retry behavior for native reconciliation. |
| `payments-reconcile-activity-checkouts` | 13 | Matching batch reconciliation and fulfillment behavior. |
| `payments-student-cancel-class` | 35 | Owner-authorized class/event cancellation, idempotent refund requests, honest pending/failed states, guest-request repair and capacity restoration. |

The changed `event-ticketing` reader also feeds `public-activity-detail` v26, which is intentionally not redeployed: its existing public-detail behavior is unchanged in this release. The eight entrypoints above are the required release boundary. Shared `env` and `stripe` dependencies affect the bundled endpoints above; do not broadly redeploy all consumers. `identity-verification-fee-create` only imports the unchanged native-return helper from `class-checkout` and requires no feature deployment for that import alone. Preserve each endpoint's existing authentication mode; these endpoints already validate authenticated requests or signed webhook payloads in their implementation.

The original seven bundles were deployed to staging and checked for startup/authentication after source review; cancellation is the eighth release target. The final refund refresh currently has staging cancellation v36, webhook v51, reconciliation v39 and activity reconciliation v14. The secure receipt pair is now staged as status v16 and guest v22. Actual owner/foreign/anonymous and signed guest receipt checks passed; private deployment hashes are in `.staging/edge-refund-deploy-results.json`. The three checkout/quote/guest bundles were subsequently refreshed in staging for the narrow checkout retry change: identical current selections reuse one actual provider session, changed selections expire the old payable session before replacement, completion blocks another payment, and lost database acknowledgements can be repaired. Five behavior tests and Deno checks for those three entry points passed. Five actual staging/provider retry checks also passed, including one pending session, changed-choice expiration and invalid-promo preservation. Function upload and type checks alone were not accepted as that evidence.

Actual paid class browser acceptance passed: quote $27.09 → Stripe test card → confirmed/registered → refresh retained enrollment. Selected-day event payment also passed at $42.54; rendered ticket/day details and calendar contain only the purchased day. Community onboarding was repeated naturally after the replay-guard correction; the earlier return-only result was not accepted as completed account setup. Actual provider retry checks passed; class and selected-day event refunds settled in Stripe TEST ($27.09/$42.54), both checkout/enrollment states became refunded, and overall/per-day capacities returned to20/20. Independent provider/database reads verified these states.

**Gate:** The final guest browser return passed on 2 November 2026 (Stripe TEST $27.09, receipt-only confirmation, independent provider/database agreement), and the closing regression/lint/type/build and port-3002 checks passed on the frozen source. Do not infer success from function upload or configured keys. Record final source hashes and staged versions in the file inventory and domain acceptance log.

## Essential production configuration changes

1. Approve the new live Industry Price at **5999 USD cents per month** on the existing Industry product, then set Vercel production `STRIPE_INDUSTRY_PRICE_ID` to that new price. Retain the existing $200 price and subscriptions unchanged; set `STRIPE_INDUSTRY_LEGACY_PRICE_IDS=price_1TugcIJefpu9FPzfY38CjBmI` for entitlement recognition only. The legacy allowlist is currently absent in production metadata. No live price, charge, subscription cancellation or customer reassignment has been performed.
2. Preserve production Supabase credentials and live Motiion Stripe credentials. `NEXT_PUBLIC_SITE_URL` must remain `https://www.motiion.app`; `NEXT_PUBLIC_APP_ENV=production` may be explicit, while Vercel Production is already recognized by the environment guard. Never publish test credentials, test prices, localhost URLs, staging account fixtures, or catalog override secrets. Protected current values require secure verification by the release operator.
3. For the existing website Stripe webhook, retain the six configured event types and append the four listed in [billing preflight](production-billing-preflight.md): subscription creation, failed invoice, Identity processing and Identity cancellation. Preserve current website versus shared Edge event ownership; do not enable duplicate subscription fulfillment. The old LIVE shared Edge endpoint is disabled and must remain unchanged. Create a separate LIVE class/event destination only after explicit production approval, targeting the shared `stripe-webhook` URL with these eight events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`, `refund.failed`, and `payment_intent.canceled`. Securely store its new signing secret as `STRIPE_ACTIVITY_WEBHOOK_SECRET`. That signing source is restricted to activity handlers; preserve the existing primary/Connect/thin secrets and event destinations. No new LIVE destination or secret has been created.
4. Production shared Edge metadata confirms `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` exist; the app URL digest matches `https://www.motiion.app`. The Stripe mode is protected and remains unproven from metadata. `STRIPE_PLATFORM_FEE_CENTS`, `STRIPE_PROCESSING_FEE_BPS`, and `STRIPE_PROCESSING_FEE_FIXED_CENTS` already exist. The deployed code failed to read these fields; the release repairs that contract rather than silently replacing production fee values. Keep the independent historical booking fee behavior unchanged.
5. Retain existing Auth SMTP, confirmation/recovery/email-change templates, Google/Apple production provider configuration and native callback destinations. Website Resend is connected. No new production email template, OAuth secret or redirect policy is requested by this package. Perform a designated-account callback/return smoke check after release.

The unused website `/api/notifications/email` and `/api/webhooks/revenuecat` secrets are absent in production metadata. They are not the delivered notification or native entitlement path and are not essential release configuration. Direct website Resend plus Auth SMTP remain their verified owners. Current iOS `BillingService` invokes `sync-apple-subscription`; the existing shared `revenuecat-webhook` uses its separate `REVENUECAT_WEBHOOK_AUTHORIZATION` and remains authoritative. Source/deployment inspection does not claim access to the RevenueCat dashboard routing configuration. Do not invent web secrets or switch routing for these unused endpoints.

The unrelated live orphan Industry subscription remains a billing-owner decision described in the billing preflight. This release does not authorize cancellation, live reconciliation to an invented account, or a shared account-deletion policy change.

## Source and private-artifact packaging

The exact working-tree path/hash snapshot is [parity-release-files.tsv](parity-release-files.tsv). It is an inventory, not a blanket instruction to stage files. Website modifications include the implementation, regression tests, nine migrations, dependency lockfile/config updates, documentation and acceptance screenshots. Shared iOS changes are limited to the reviewed Edge sources and payment tests; do not bundle unrelated native project, `.DS_Store`, local CLI metadata or existing `output/` design/verification artifacts.

- `.env.local`, `.staging/`, `.vercel/`, `node_modules/` and `.next/` are Git-ignored. `.vercelignore` independently excludes those paths, agent caches, `supabase/.temp/` and TypeScript build caches from CLI upload. No private fixture, token, cookie jar or credential file is a release input.
- Git tracked-file inspection found no `.staging`, `.vercel` or private `.env` files. A bounded secret-pattern scan of changed textual release candidates found no Stripe secret/webhook keys, private keys or JWT values. This is a packaging check, not a claim that every possible secret format was scanned.
- Exclude the locally modified tracked `supabase/.temp/cli-latest` and shared `Supabase/.temp/cli-latest`; preserve them locally. Include only example environment files, with blank/placeholder secrets.
- Keep `package.json` and `package-lock.json` together. Current website runtime pins include Next/ESLint config `16.4.4`, React/React DOM `19.2.3`, and repeatable `tsx` test tooling. Do not copy `node_modules` or another task's build output.
- Current product text no longer offers booking contracts/payment requests. Legacy financial records and the retired notice remain deliberate. Unrelated class/event billing, subscriptions and Identity are retained. Historical docs are marked retired; they are not deployment instructions.

## Approval and release sequence

After the final source freeze, record the exact file inventory and committed source SHAs, then run the closing regression/lint/type/build checks and production-mode navigation acceptance. Review the nine SQL files and shared class bundles as concrete artifacts, plus the live Price/webhook/environment changes above. Obtain explicit production approval for this set and its documented privacy/legacy-contact consequences.

After approval: capture current hosted definitions and function bundles; apply only missing reviewed migrations; deploy/configure the reviewed shared functions; stage the website with **production** configuration without assigning production domains; verify that exact deployment; then promote it. Recheck callback/approval, current entitlement, publication/submission/finalization/coordination, private/public sharing, class enrollment and webhook behavior with agreed test accounts. Never perform real charges or unsolicited customer messages under a smoke-test assumption.

Rollback the website to the recorded current deployment if necessary, while preserving additive schema, legitimate selections, audit rows, payment records and captured authorship. Keep privacy protections in place; a rollback that reopens disclosure or removes trusted billing proof needs separate approval. The SQL review contains per-change recovery guidance. Shared function rollback must use the captured production bundle, not the stale repository base.

### Receipt access review and staging boundary

Automatic approval review rejected deployment of the old unauthenticated checkout-status endpoint because a session ID exposed customer email and checkout/activity data through service-role reads. The rejected deploy was not bypassed. The replacement was accepted and deployed to staging after redesign: detailed status/reconciliation requires the actual owner; a separate seven-day exact-session signed capability returns only `{sessionId,status,receiptOnly:true}` with no provider reconciliation, contact or activity data. The proof uses a purpose-separated derived key from the existing server-only webhook secret, so no new production secret is required. The guest browser stores it only in session storage; another browser/device requires account recovery/sign-in. Actual staging owner200/foreign404/anonymous401 and guest issuance/minimal response/tamper/wrong-session checks passed. The actual anonymous guest hosted-payment return was then browser-exercised against staging status v16 / guest v22: Payment confirmed rendered the receipt-only state, and a tab without the proof was offered sign-in rather than status.

The isolated Stripe TEST destination now receives all eight activity events above. Free-event cancellation passed six authenticated checks, including unauthorized/foreign rejection, restored day capacity, removed entitlement, repeat cancellation and re-enrollment. No real refund or production financial mutation is authorized by those test results.
