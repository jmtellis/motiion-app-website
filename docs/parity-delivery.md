# Motiion website parity delivery

Status: implementation and verification in progress. This document records evidence, not a claim of completion.

## Authority and environment

- User brief dated 2026-11-02 supersedes historical parity/booking documentation.
- Current iOS reference: `604ccd28`; website baseline: `c084894` on `main`.
- Delivery target confirmed by user: main / production website. Existing isolated local staging is used for test-account validation; no staging deployment prerequisite.
- Production Supabase: `pygdxcscmebeqjxhzzuq`. Existing test branch: `mvkvztpvakybrhyupown`, confirmed healthy through connected Supabase on 2026-11-02.
- Existing local changes preserved: website `supabase/.temp/cli-latest`; iOS `.DS_Store`, Xcode project, Supabase CLI temp and untracked `output/`.
- Never copy staging data into production. Shared schema migrations are inspected by version and applied only once per environment. No destructive production actions or customer communications.

## Work sequence

1. Establish source, schema, auth and automated baseline; map meaningful app capabilities.
2. Complete auth/email/onboarding/application and projects/casting/coordination vertical journeys.
3. Complete calendar, inbox, search, roster and profile reliability and navigation.
4. Consolidate practical design tokens, controls, states, dialogs/panels and responsive layouts.
5. Exercise authenticated journeys, permissions and failure states; visually inspect desktop/tablet/mobile and iterate.
6. Validate build and regression checks, prepare reviewed deployment, verify deployed main and document remaining external limits.

## Capability matrix

Detailed rows include role/outcome, iOS reference, web route, backend/authorization, gaps, decisions and evidence. Domain implementation records are maintained alongside this index.

| Capability | Roles / outcome | Evidence record | Current disposition |
| --- | --- | --- | --- |
| Account signup, OAuth, recovery, email confirmation | Talent / industry get a usable authenticated account | [Auth evidence](parity-auth.md) | Implemented; actual confirmation/recovery and same-account two-inbox email change verified in staging. Real Google consent/session → existing completed Home passed, same identity/no duplicate verified. Apple consent not exercised. |
| Essential talent onboarding and profile completion | Talent can start quickly and finish profile later | [Auth evidence](parity-auth.md), [Account/portfolio](parity-account.md) | Implemented; browser essential onboarding → usable Home passed. Optional portfolio editors remain separate; real storage/profile/extraction checks passed. |
| Industry application, staff decisions, setup | Applicant / staff / approved professional | [Auth evidence](parity-auth.md) | Implemented; real application/status/authorization checks and browser staff approval → approved setup → workspace passed. Existing shared approval dispatcher delivery inspected. |
| Projects, roles, casting, review, selection, availability, schedules, files and sharing | Industry coordinates work; talent responds | [Projects matrix](parity-projects.md) | Implemented; genuine owner/talent JWT draft → publish → submit → review → exact finalization → People → availability → confirmed dates passed. Actual desktop/mobile publication → submission → review → client feedback → finalization → coordination → calendar and archive/restore passed. |
| Booking agreements and payments | Historical users recover context without starting obsolete flows | [Projects matrix](parity-projects.md) | Intentionally removed from product; legacy URLs explain retirement. Historical backend data and supported coordination remain. |
| Calendar, requests and inbox | Both roles coordinate with reliable dates, messages and unread state | [Calendar/inbox/search](parity-calendar-inbox-search.md) | Implemented; real browser messages, requests, conflict responses, size-sheet PDF and populated calendar passed. Physical offline/reconnect and large-account stress checks not claimed. |
| Typed / voice search, filters, credits and experience | Industry and talent discover relevant people | [Calendar/inbox/search](parity-calendar-inbox-search.md) | Implemented; typed browser search, permission-wait/cancel, real authenticated transcription and blocked-profile exclusion verified. Physical microphone/multiple-engine acceptance remains limited. |
| Saved collections, project rosters, membership and sharing | Industry organizes and shares talent with permissions | [Product surfaces](parity-product-surfaces.md), [Member access](parity-roster-access.md) | Implemented; owner/member/public-link authorization and privacy passed; browser saved profile, roster inspection, member grant, public open/revoke and file downloads exercised. Actual recipient login, shared roster search/no-match recovery, canonical profile navigation and Back passed. |
| Talent / professional profiles, portfolio, privacy and editing | Both roles present and maintain their work | [Account/portfolio](parity-account.md) | Implemented; professional browser save and public/mobile profile reviewed. Real optional profile fields/uploads tested; every media editor manipulation not claimed. Privacy migrations staging-verified, production pending. |
| Home, Discover, Opportunities, community / activity | Both roles find useful next actions and content | [Calendar/inbox/search](parity-calendar-inbox-search.md) | Existing useful feeds retained; community classes/live and public Open Calls entry repaired. Actual account route/catalog checks pass; remaining interactive community review tracked separately. |
| Class / event enrollment, paid tickets, selected days and cancellation | Talent / Community reserve and manage attendance | [Activity matrix](parity-activities.md) | Actual Stripe TEST class and selected-day event checkout passed, including persisted registration and exact purchased-day calendar. Isolated free-event cancellation/capacity/retry passed. Actual paid class/event refunds settled and restored capacity; signed guest receipt and owner access integration passed; actual anonymous guest browser payment returned to receipt-only confirmation, and the final optimized build passed. Production rollout pending approval. |
| Account settings, block/report/referrals, shell switching and deletion | Both roles control their account | [Account matrix](parity-account.md) | Implemented missing controls with actual shared contracts. Fourteen disposable-account assertions passed, including deletion and owned storage; no real account deleted. |
| Billing, identity and service integrations | Both roles receive the correct access independently of approval/email | [Billing review](parity-billing-review.md), [Release review](parity-release-review.md) | Real Stripe test checkout/portal/webhooks/Identity and real email/OpenAI paths verified. Production subscriber/configuration reconciliation remains under read-only release review. |
| Design system, navigation and detail panels | Both roles use coherent, accessible desktop/mobile UI | [Design documentation](design.md), [Standalone reference](design.html), `/admin/design-system` | Implemented semantic tokens/shared controls/overlay behavior and applied across product. Representative desktop, 768px tablet and 390px mobile review completed; actual protected component gallery, dialogs, selected tabs and corrected contrast/legacy surfaces recorded. Broader zoom/physical-device checks are not claimed. |
| Native-only platform capabilities | Web-appropriate equivalents, explicit exclusions | [Product surfaces](parity-product-surfaces.md) | Intentionally exclude native permission screens, StoreKit purchase UI and device-only interactions. Preserve web sharing, calendar and current entitlements. |

## Baseline evidence

- `npx tsc --noEmit`: passed before implementation.
- Full behavior suite via Node + existing cached tsx loader: 261 / 263 passed. Failures: obsolete passcode expectation in `profile-shells.test.ts`; missing `server-only` package import in `talent-search-guard.test.ts`.
- `npm run lint`: failed with 60 errors and 102 warnings before implementation. Raw local log `/tmp/motiion-baseline-lint.log`.
- `test:environment`: 9 / 9 passed. Local configuration isolated from production; live public catalog is read-only.
- Browser preview started at `http://localhost:3001`; acceptance is pending, no live flow is claimed from source inspection.

## External verification and remaining release work

- Resend website-only Vercel integration is connected. A transactional test message and real staging Auth confirmation/recovery messages were delivered to the user-designated `jay@motiion.io`. Auth owns confirmation/recovery; the website owns its transactional notifications. Production SMTP/provider/redirect configuration was inspected read-only.
- Real Stripe **test-mode** checkout, subscription webhook, Industry Pro entitlement and billing portal passed. Anonymous/cross-account entitlement grants, bad signatures, duplicate and stale events were rejected or ignored as appropriate. No real charge was made. See `parity-billing-review.md`.
- With explicit user authorization, the existing local OpenAI key was used for an authenticated staging transcription. The real provider returned the expected spoken query. This does not claim physical microphone recording or universal browser support.
- Vercel project/team access is confirmed. Production deployment and anonymous smoke checks completed on 2 November 2026; see the release manifest.
- All nine reviewed migrations—casting finalization, verified Stripe entitlement, identity protection, roster hydration, conflict audit, profile privacy, operator-only candidate writes, submission provenance and free activity registration—are prepared and tested in staging. All nine were applied once each to production on 2 November 2026 after explicit approval.
- User explicitly approved staging identity-field protection after automatic approval review rejected that security-related schema write. The applied guard preserves existing results and prevents ordinary clients from self-verifying.
- No attached interaction references were present in this chat. Existing rendered product surfaces and the requested interaction principles guide improvements.

## Current consolidated verification

- Full behavior suite checkpoint: **442 passed, zero failed**. Further regression tests added during the final browser review are included by `npm test` glob; final count is recorded after source stabilization.
- Full ESLint checkpoint: **zero errors, 35 warnings**. Disposable ignored `.staging` harnesses and vendored minified Lenis are excluded; product rules remain active.
- Runtime dependency audit after compatible updates: **zero critical/high, 13 moderate and 1 low**. Remaining reports concern transitive archive/build utilities; no forced major/downgrade was applied.
- Roster export: actual browser Excel/PDF downloads opened successfully; independent authenticated HTTP bytes/permission checks passed five groups. Excel uses absolute canonical profile links; PDF pagination and Unicode names visually reviewed.
- Optimized Next.js build and TypeScript passed in an isolated source copy with staging configuration. Final incremental corrections still require the closing build; neither local build is a production deployment.
- The [rendered acceptance record](parity-browser-acceptance.md) tracks actual UI journeys, screenshots and remaining passes separately from API tests.

## Continuation and release package

The [production approval manifest](parity-release-checklist.md) records the exact nine migrations, shared Edge package, configuration changes and rollback boundary. The [continuation checkpoint](parity-continuation.md) preserves current work, pending checks and a handoff prompt. The package was released to production on 2 November 2026. Anonymous production smoke checks passed; authenticated production journeys with designated accounts are not yet established. See the manifest's [Production release result](parity-release-checklist.md#production-release-result).
