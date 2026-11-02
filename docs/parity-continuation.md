# Motiion parity — continuation instructions

Updated 2 November 2026. This is a live handoff checkpoint, not a completion report. Preserve the existing implementation and continue the remaining verification and release work; do not restart the audit or rewrite the platform.

## Paste this into another coding assistant

> Continue the Motiion website parity implementation already in progress. Work in `/Users/jtellis/Documents/Development/motiion/motiion-app-website`, using `/Users/jtellis/Documents/Development/motiion/motiion-app-ios` as the current product and shared-backend reference. Read `AGENTS.md`, then `docs/parity-continuation.md`, `docs/parity-delivery.md`, `docs/parity-browser-acceptance.md`, `docs/parity-activities.md`, and `docs/parity-release-checklist.md`. Inspect the working tree before changing anything. Most implementation is already complete and deliberately uncommitted; preserve it and unrelated local changes. Finish the specific pending checks below, fix real defects, run the final checks, review the rendered desktop/mobile UI, and prepare the precise production rollout for approval. Do not claim completion until required integration and deployed-environment checks actually pass. Do not expose secrets, charge real cards, send unsolicited messages, delete production data, or replay shared migrations. Ask for the explicit production access/configuration approval described in the release manifest only after the implementation and independent checks are concrete and reviewable.

## Repositories and local changes

- Website: `main`, baseline `c084894d0f0cc1d240231d09d76a2099a2bd5c09`.
- iOS: `main`, baseline `604ccd28beeb0af5995ca12bd02dc196c0811a76`. Relevant changes here are shared Edge functions and their payment tests, not a native redesign.
- Preserve unrelated website `supabase/.temp/cli-latest`; iOS `.DS_Store`, Xcode project, CLI temporary metadata and existing `output/` work.
- `docs/parity-release-files.tsv` inventories candidate paths and hashes. Refresh it at final source freeze; it is not blanket permission to stage every file.
- Private credentials/fixtures are in ignored `.staging/`, `.env.local`, and existing approved local service configuration. Read them locally only when needed; never print or include them in commits, screenshots or handoff text.

## What is already implemented

- Auth, verification/recovery, shortened talent essentials, industry applications and staff review/setup, returning-user routing and cross-tab account isolation.
- Active/Drafts/Archived project cards; casting draft/publication, invitations/submissions, review/shortlist, exact final selections, project People, availability and date confirmation, archive/restore, sharing and exports.
- Obsolete website booking contracts/payment requests removed; historical shared records/handlers preserved. Subscription, Identity and class/event billing remain in scope.
- Calendar/date handling, inbox requests/messages/badges, typed/voice search, roster access/privacy, profile/account/portfolio editing, community discovery and artist follows.
- Shared semantic visual tokens, controls, panels/dialogs, status/error/loading states and responsive layouts. See `docs/design.md`, `docs/design.html`, and authenticated `/admin/design-system`.
- Authenticated free class/event reservation and actual Stripe sandbox class/event payment, selected-day admission and Calendar placement. Final refund/status security checks are still being completed.

The domain matrices, not this short list, carry source references, authorization dependencies, exclusions and detailed evidence.

## Latest verification checkpoint

- Full `npm test`: **442 passed, zero failed**, 48 suites (`/tmp/motiion-final-checkpoint-tests.log`).
- Full `npm run lint`: **zero errors, 35 warnings** (`/tmp/motiion-final-checkpoint-lint.log`).
- `npm run typecheck`: passed (`/tmp/motiion-final-checkpoint-typecheck.log`).
- Optimized `npm run build`: passed on the final source in `/tmp/motiion-release-build` with isolated staging configuration (`/tmp/motiion-final-checkpoint-build.log`), including the public action-bar stacking fix. Port 3002 serves that build.
- Actual anonymous guest browser payment: $27.09 TEST → receipt-only Payment confirmed; read-only provider/database check agrees (`.staging/guest-browser-payment-results.json`). Mobile 390px ticket-form reflow passed.
- Runtime dependency audit previously found no critical/high findings, 13 moderate and 1 low transitive findings.
- Actual browser evidence covers talent essentials, industry staff approval/setup, Google returning-user login, profile/settings, roster receive/share/revoke/export, casting through confirmed dates, notifications, calendar, inbox, desktop/tablet/mobile component states and cross-tab sign-out.
- Actual TEST refunds: class $27.09 and event $42.54 succeeded at Stripe, restored capacity and removed the reservations from Calendar. Screenshots `class-refund-confirmed.jpg`, `event-refund-confirmed.jpg`, `refunded-activities-calendar.jpg`.
- Actual paid class: $25 + $2.09 fees = $27.09 TEST payment, confirmed return, registered state and refresh persistence.
- Actual event: one-day ticket $40 + $2.54 fees = $42.54 TEST payment, exactly Day two / 15 December entitlement verified in the database and displayed in event detail. Exact December 15 admission and Calendar placement were visually verified; December 14 contained no purchased event.
- Legacy malformed `account_type=dancer` fixture exposed a completion replay bug; fixed to skip only valid completed roles. Natural browser recovery now saves Community and reaches Home. Artist follow persisted across refresh; Calendar access now works.
- Optimized-build project checks: industry login → Active/Drafts cards → finalized overview → People → canonical talent panel, Escape closes and restores opener focus; desktop and 390px Project cards visually reviewed. Cmd+zoom did not change the measured viewport, so 200% zoom is not claimed.
- Screenshots: `docs/parity-screenshots/`. Files with `defect` in their names are diagnostic evidence, not final product screenshots.

## Finish these next

1. Secure guest receipt implementation is now complete and deployed to staging: `web-checkout-status` v16 and `web-guest-class-book` v22. Seven-day, exact-session signed receipt proof is stored in same-browser sessionStorage before Stripe. Anonymous proof allows only `{sessionId,status,receiptOnly:true}`; no contact/activity detail or reconciliation. Owner JWT retains detailed status. Real staging checks passed for owner, foreign, anonymous, new unpaid TEST guest proof, tampered and wrong-session rejection. **Done:** actual guest browser payment → return acceptance passed (`guest-receipt-confirmed.jpg`, `guest-receipt-no-proof.jpg`). Do not claim cross-device guest receipt support: missing/expired proof offers sign-in/recovery.
2. Refund settlement review and staging deployment are complete. The reviewed cancellation v36, webhook v51, reconciliation v39 and activity reconciliation v14 are now staged. The isolated TEST endpoint receives all eight activity event types. Pending/partial refunds must not be reported as completed, and old purchase events must not alter later admission. Preserve historical production handler branches.
3. Actual TEST-only class and event cancellation now passed in the browser. Provider refunds succeeded for 2709 and 4254 cents; database checkout/enrollment states are refunded; overall and event-day capacity returned to 20. Refresh preserves refunded feedback. Calendar no longer shows either paid reservation. Provider retry/idempotence is additionally covered by the shared tests. Preserve this evidence; do not refund a real purchase.
4. Selected-day Calendar and linked detail passed before refund: December 15 only, with ticket name and exact admitted date in the hero and registered section. Updated `paid-event-admission.jpg` captures final copy. The final ticket-form visual pass found dark text inherited from the shared dialog on the dark public activity card. The activity card now restores its semantic foreground, limits dialog height with scrolling and uses 44px day-selection targets. Desktop contrast was visually rechecked and captured in `event-ticket-form-readable.jpg`; Escape restored the trigger focus. **Done:** 390px mobile form reflow passed (`event-ticket-days-mobile.jpg`, `event-ticket-form-mobile.jpg`). The guest pass also found the fixed Book bar painted under the footer on short pages; `public-review.css` fixes it and the optimized build was hit-tested.
5. **Done:** final optimized build, 442/442 tests, lint 0 errors/35 warnings, typecheck, `git diff --check` and port-3002 route/action-bar checks. Native Escape could not be re-exercised because the closing browser tool sent untrusted key events; 200% zoom remains unclaimed.
6. Reconcile every parity-matrix disposition, update screenshots/check counts, refresh release path hashes, review diffs, and commit only the scoped website/shared-backend files. No commits or production deployment had happened at this checkpoint.
7. Obtain the explicit production approval in the release manifest for the nine SQL changes and live configuration/webhook package. Then apply only missing exact migrations, deploy reviewed shared bundles, deploy the website with production configuration without assigning domains, verify it, and promote. Never copy staging fixtures or credentials into production.
8. Deliver a concise evidence-based final report linking the parity matrix, design reference, actual test/browser results, screenshots and any remaining external limits.

## Environments, permissions and release decisions

- User selected **main/production delivery**, with isolated staging test accounts. Production is not yet changed by this release.
- Supabase production `pygdxcscmebeqjxhzzuq` (`api.motiion.app`); test branch `mvkvztpvakybrhyupown`.
- Vercel website project `prj_rgsXot0osCn7iH6MYpnxrPWqqArA`, team `team_GgBckfXeHQE2Qz77R6mLuog8`. Current production deployment `dpl_GUd6HY4Y6AnXbXdax3FideKNihzX`.
- Vercel connected access and CLI access are verified (`npx --yes vercel whoami` returned the existing account). Official CLI 65.9.0 supports `deploy --prod --skip-domain`; do not use `--verify` casually because it can create a persistent protection bypass secret.
- Existing Resend/Vercel connection, Auth SMTP, real test email delivery and linked actions were verified. Google staging callback and secondary secret were explicitly approved and configured; production Google configuration remains unchanged.
- User-designated email tests are staging-only: `jay@motiion.io` and `jtellis17@aol.com`. Secure email-change test changed the staging Jay account to AOL; production account unchanged. Google test used existing `jaymtellis@gmail.com`.
- Stripe sandbox/test access, fictional organizer onboarding and test card transactions are authorized. The organizer's Connect readiness was verified. No live charge/refund is authorized.
- New live Industry offer should match iOS **$59.99/month**. Keep the legacy $200 price/subscriptions intact and recognize them via the documented allowlist. The unrelated orphan live subscription is not authorized for cancellation/reassignment.
- Production Stripe inspection found the website subscription/Identity endpoint enabled; the older Supabase endpoint was explicitly disabled by a user. V2 destinations were also inspected: no hidden active Connect/thin delivery exists. Prepare a **dedicated class/event endpoint and optional `STRIPE_ACTIVITY_WEBHOOK_SECRET`** with signature-source scoping; do not re-enable the old disabled identity stream or overwrite its unknown secret. Exact events and approval are in the release manifest.
- All nine additive SQL files are tested in staging and pending production approval. Check migration contents/hosted ledger once per environment; some staging timestamps differ. Never run a broad `db push` to replay shared history.

## Useful local verification commands

Run from the website repository:

```sh
npm test
npm run lint
npm run typecheck
git diff --check
```

For an optimized build without disturbing the active dev server:

```sh
rsync -a --delete --exclude=node_modules --exclude=.git --exclude=.next --exclude=.staging --exclude='.env*' --exclude=.vercel --exclude=docs/parity-screenshots --exclude=supabase/.temp /Users/jtellis/Documents/Development/motiion/motiion-app-website/ /tmp/motiion-release-build/
install -m600 /Users/jtellis/Documents/Development/motiion/motiion-app-website/.env.local /tmp/motiion-release-build/.env.local
cd /tmp/motiion-release-build
npm run build
npm run start -- -p 3002
```

The isolated copy already contains installed dependencies. Check for an existing port-3002 process before rebuilding/restarting it; do not stop unrelated processes. Dev runs on port 3001. Production-mode local testing still uses staging data and is not a production deployment.

## Test fixtures and browser checkpoints

- Private account file `.staging/class-enrollment-accounts.json`: `class_student` is the root browser actor; `class_other` is the independent API-test actor. Do not concurrently mutate the root actor.
- Class `e066cfea-b6ec-4cb6-ba13-7c564fe5190c`; event `99727b36-ccb2-45ed-b150-ed46aba7c65b`; metadata `.staging/paid-activity-fixture.json`.
- Private general test accounts `.staging/parity-20261102-accounts.json` include talent, industry, staff and roster actors. Do not publish their passwords/tokens.
- Actual casting project `ae495dce-117e-473e-9e99-335913cd1c12`, role `aa243daf-0f69-45ae-8980-653e1fba82af` is finalized with one confirmed person and November 20–21 date-only availability.
- Do not claim Apple consent, physical microphone/multiple-browser support, physical offline/reconnect, cross-device automatic session establishment, or every crowded/zoom case passed. Read `docs/parity-browser-acceptance.md` for exact coverage limits.

## Credit monitoring

At the user's request, the active Codex agent checks the account usage tool at major milestones. The latest reported purchased balance was approximately 172 credits; included weekly usage was exhausted. This is an account-wide observation, not a reliable remaining-time estimate. Keep this handoff current before the balance becomes low. Do not publish the account identifier or purchase credits automatically.

## Final handoff boundary

Production is unchanged; no push or deployment has been made. Guest browser return, mobile activity-form reflow, the final optimized build and closing checks have passed. Remaining: commit only reviewed scoped files, obtain the exact production access/configuration approval, deploy without domains, verify, and promote. Port 3002 serves the final optimized build; port 3001 remains the dev server. Never use local staging configuration for production.
