# Launch readiness admin dashboard

Web entry: `/admin/analytics`. Native entry: Settings → Analytics. Both expose Overview, Talent, Industry, Engagement, Revenue, Reviews and Goals. The web design preview at `/preview/admin-analytics` uses clearly labeled, fictional local fixtures and disables mutations. Preview fixtures never touch a database.

## Shared contract and rollout

`20261031142716_admin_launch_dashboard.sql` is mirrored byte-for-byte in the web and iOS migration directories. Apply **once** to the shared database, after the existing profile-review and industry-application migrations. It was applied to industry-staging on 2026-10-31; production is unchanged. See the hosted version mapping below. No targets, exclusions or financial records are seeded.

The migration provides:

- `admin_launch_snapshot(p_days)` with independently nullable/error-bearing sources, a fetch time, and explicit period bounds. Both clients use it. Web has a server-only fallback for existing records before rollout; unavailable new tables stay unavailable. iOS shows a migration/connection error until the contract exists.
- `admin_launch_goals` and `admin_launch_goal_history`, readable only by platform staff, with version-checked writes through `admin_save_launch_goal`. History is an explicit staff observation at save time, not an automatic daily collection or immutable financial ledger. Owners are team-entered names. Targets are unset until staff saves them.
- `admin_analytics_exclusions`, managed by the protected `admin_set_analytics_exclusion` RPC. No name/email heuristics. Accounts and records belonging to excluded users, plus related projects, activities and lists, are filtered in both clients. This is an explicit registry, not proof that every historical test account is registered.
- `admin_review_profile_request`, which locks the profile, compares the pending request ID, then invokes the existing `review_profile` workflow. An error payload becomes a transaction exception, rolling back partial legacy writes. Both web and native dancer decisions use it. Industry review continues using its existing version-checked RPC.

All entrypoints check `auth.uid()` and trusted `auth_is_platform_admin()`; public/anonymous execution is revoked. New tables have RLS, no direct authenticated write grants, and staff-only read policies. No service key reaches a browser or native client. Web reads only the configured auth database, never the separate production catalog.

Native review screens remain the full operational queues. The dashboard's scoped review summary and web integrated inbox honor analytics exclusions. The standalone web industry review page remains available for the complete operational queue.

## Definitions shared by both clients

- Talent includes the talent shell or talent account type. Industry includes the industry shell and legacy `lookingForTalent` / `looking_for_talent` values, as well as industry/non_talent.
- Ready talent is an operational five-item checklist: setup timestamp (`profile_setup_completed_at`, with legacy `onboarding_completed_at` fallback), at least one headshot, one profile video, a resume or experience credit, and styles. It is distinct from Motiion review approval and identity verification.
- Approved industry is an approved application, not entity verification, subscription status or a legacy access exception.
- Available opportunities are public active upcoming classes/sessions and public open castings. Active projects use `is_active` (legacy active status fallback), exclude composer drafts, and have no past end date. Active class/session records have active status and date today or later UTC. Open castings have open status and no expired top-level submission deadline. Role-specific capacity and deadline reconciliation is not included.
- All-time inventory means all *currently stored* records regardless of creation date, not reconstructed deleted history. Period creation counts are separate. Sessions mean dance sessions, not browser sessions. Rosters exclude favorite lists.
- Acquisition uses stored `acquisition_source` and `acquisition_source_detail`, separate from referral attribution. Resume imports use `resume_parse_runs`; an import diagnostic is not proof all credits were imported. Portfolio counts come from stored headshot/video arrays.
- DAU/WAU/MAU are distinct signed-in users with any recorded event in trailing 1/7/30 days. Feature adoption and meaningful users deduplicate user IDs. No sum of source transactions plus telemetry is used. Dual-shell users can appear in both adoption columns.
- Weekly/monthly return compares adjacent 7/30-day event windows. It is explicitly not signup-cohort retention. Incomplete setup is not called confirmed abandonment. Identity events and Stripe account linkage are distinct paths; linkage alone does not establish payout capability.
- Review turnaround uses completed request/review rows with known submitted/decision timestamps; pending creation timestamps are excluded. It is all-recorded-history average, with missing sources producing unknown. Goal observations are manual and comparisons are to prior observations.

## Financial coverage

Subscriptions show active records by provider and plan, trials, cancellations and current failure states. Provider mirrors can overlap; they are not deduplicated paying people. No price table multiplication is used for MRR. Billed amount/interval/currency history and opening cohorts are needed for reliable MRR and churn.

Identity verification uses succeeded `identity_verification_fee_payments` customer charge records, by currency. Costs, refunds and net income are unavailable without a ledger.

Paid booking deal memos supply charge amounts, contractual platform fees and refund amounts against those paid memos. Code implements 10% on top of talent pay. The refund total is scoped to the payment cohort, not refund occurrence date; fee refund allocation, settlement, processing costs, payouts and retained amounts remain unreconciled.

Class/event checkout implementation was inspected in iOS `Supabase/functions/_shared/checkout-pricing.ts`: a configurable **flat** Motiion fee plus processing gross-up, above the instructor ticket price. The application fee includes processing. It is not all platform income and is not a percentage of class sales. Checkout/enrollment state counts are shown, but prices are not multiplied by registrations to fabricate volume. `updated_at` is labeled as an update time, not payment time.

Motiion-run event ticket sales need an explicit operator designation and sales/refunds/costs/payables ledger. `sponsored_by_motiion` is not used as proof of event ownership. Ticket sales, passthrough volume, fees and retained amounts remain distinct.

## Tracking and scaling gaps

Media playback/selection and executed search filters are not consistently instrumented. Saved search filters are displayed as saved state, not usage. True signup-cohort retention, complete ordered onboarding funnels, Connect completion, and reconciled financial ledgers remain unavailable. No production sample data or synthetic chart is used to hide these gaps.

Snapshot reads are bounded at 100,000 rows per source; exceeding that returns an explicit error rather than a partial total. Web fallback paginates with exact counts and stable key ordering, and also withholds capped/incomplete totals. This is a launch-scale implementation; large datasets should move to indexed aggregate RPCs. Fetch time is not a promise of complete telemetry or provider webhook freshness.

## Validation

- 24 web tests pass across new dashboard rules, existing early signals, signup series and industry application validation.
- TypeScript check and targeted ESLint pass.
- Isolated Postgres 17 tests exercise anonymous/nonstaff denial, RLS/direct-write denial, missing sources, goal history and stale versions, exclusions, stale request rejection, double-review rejection and rollback on legacy review failure.
- Full iOS Demo arm64 simulator build passes (Xcode, code signing disabled). Native UI was not exercised against a hosted migrated environment.
- Native pure-model checks cover readiness, unknown values, lifecycle boundaries, explicit exclusions, event deduplication and JSON roundtrip.
- Browser inspection verified all seven sections, company search, person detail, review inbox and mobile 390px layout without horizontal overflow. Screenshots: `admin-launch-desktop.png`, `admin-launch-mobile.png`.
- A pre-existing sample analytics test exposed a clock mismatch; the date-range helper now accepts the supplied fixture time, keeping the legacy tests deterministic.

## Staging rollout — 2026-10-31

Target: `industry-staging` (`mvkvztpvakybrhyupown`). Production was not changed. The web app remains a local development build; no hosted frontend deployment was performed.

- Dashboard migration local `20261031142716` was applied as hosted `20261031144333` (`admin_launch_dashboard`). Do not replay the create-table migration because the timestamps differ.
- The missing resume diagnostic source was restored using the existing iOS migration `20260905010000_resume_parse_runs.sql`, hosted as `20261031144551` (`resume_parse_runs`).
- A dedicated user-authorized email/password staging admin was created. Existing shared admin credentials and all existing profile rows were preserved. Password login, platform-admin authority and authenticated snapshot access passed. All 22 sources returned successfully.
- Live browser login and Overview, Talent directory and Goals editor were verified. The fresh account initially enters onboarding after login; opening `/admin/analytics` directly accesses the dashboard.
- Hosted authenticated transaction tests passed for goal creation/history, optimistic version conflict, exclusion changes, stale review rejection, nonadmin denial and RLS. All test writes were rolled back. Goals/history/exclusions and profile review requests remain empty; no application decisions were committed.
- Existing profile checksum remained `f3686e41c677ab7b20a417243e840d66`; industry application checksum remained `e80b8cf254d23cc8e3daaee4179b1685`. User/profile totals increased from 166 to 167 solely for the requested admin.
- Security advisors were inspected. New authenticated SECURITY DEFINER RPC notices are expected for these explicitly admin-gated functions; nonadmin rejection was verified. Existing legacy analytics advisories were not changed. See [Supabase database linter](https://supabase.com/docs/guides/database/database-linter).
- Native Demo compilation/model tests passed; a signed-in native runtime review decision was not exercised. Successful/double-review/legacy-failure rollback paths were tested locally with minimal fixtures, not by deciding an existing staging application.

Temporary supplied credentials were removed after sign-in verification. No credentials are included in this document.


## Brand and historical charts — 2026-10-31 iteration

- Web dark accent is `#00D4F0`, copied from canonical iOS `Motiion/design-tokens/ios.json` (`textAccent.dark` / `primary500.dark`). Native continues to use `MotiionColor.textAccent` (light `#00AACC`, dark `#00D4F0`).
- `public/admin-wordmark.svg` is byte-identical to iOS `CredentialWordmarkBlack.imageset/wordmark.svg`. Both render the original silhouette white on dark surfaces; no substitute text or invented icon remains.
- Overview now places historical charts directly after launch priorities. Talent, Industry and Engagement have focused trend charts. The existing Recharts implementation used by signup analytics is reused as the charting dependency; snapshot aggregation preserves this dashboard's rolling 24-hour windows rather than silently mixing calendar-day signup buckets.
- Charts show new profile records, projects created, classes/sessions/castings created, roster lists created (excluding favorites), and distinct observed signed-in users. Engagement also charts meaningful users. Creation series count currently stored records by creation timestamp, across current statuses/visibility, never historical active inventory. Talent/industry splits use current profile classification.
- Selected 7/30/90-day periods compare with the immediately preceding equal-length period, aligned by day. Current totals and differences are separate from daily values; active-user period totals deduplicate across the whole period. Daily user counts are not additive. Dashed comparison lines distinguish series without relying on color. UTC ranges, axes, tooltips and expandable daily-value tables support inspection.
- Source errors show unavailable. No dated records in either period shows insufficient history. Missing timestamps are omitted and disclosed. Zero within an available recorded series means no observed records, not proof of complete telemetry. No financial history or deleted-record history is inferred. Existing exclusions apply before aggregation.
- Validation: 10 web domain tests pass, including period boundaries, missing dates, duplicate users and empty/unavailable histories. TypeScript and targeted ESLint pass. Native model checks include matching boundaries, user deduplication and missing history. Browser checks at 1280px and 390px verify the actual wordmark, rendered charts, readable 30/90-day axes and no horizontal overflow. Engagement's focused charts and range selection were exercised.
- Screenshots: `admin-launch-trends-desktop.png` uses live staging records; `admin-launch-trends-mobile.png` uses the explicitly labeled fixture preview. No database, production deployment, approval workflow or credentials were changed in this iteration.


## Final workspace and directory revision — 2026-10-31

This supersedes the dark web content surface described above. Web now reuses `workspace.css` frame layout and `talent-studio.css` light surface tokens: a black sidebar and a white inset content panel. The sidebar keeps the white canonical wordmark and dark iOS accent; light content uses canonical `#00AACC`, with `#007A99` for accessible links, primary buttons and chart strokes. Comparison lines are dashed and use a contrasting muted purple. Native retains its existing settings navigation and semantic app appearance.

The sidebar's persistent **Back to app** link uses `getProfileDestination` from the existing auth/profile routing, based on the authenticated admin's active shell. The actual admin entry remains Settings → Open analytics. Live testing returned the current talent admin to `/home`; industry destinations use the same existing shell resolver. Mobile navigation includes the exit. No marketing destination, logout or destination picker is introduced.

Talent and Industry directories both default to newest signups, with oldest and name sorting, deterministic tie ordering, missing dates last, and 50 accounts per page. Search/status/sort/page/range survive detail-page return links. Web uses a bounded keyboard-focusable scroll region with sticky column headers and pagination outside it, without a second visible container frame. Native uses ordinary page scrolling with Previous/Next controls and a pushed detail screen. Select arrows have consistent inset and text padding while retaining native select semantics.

On wide web screens, **New talent profiles** and **Talent directory** sit side by side. On smaller screens the chart comes first. Directory filters do not alter the account-type creation chart, which is labeled accordingly.

Dedicated routes:

- Live: `/admin/analytics/users/[id]`, covered by the existing admin layout and `loadDashboard` authorization checks.
- Fixture preview: `/preview/admin-analytics/users/[id]`, with decision controls disabled.

Details include existing identity/headshot, account type/access/company, joined date, a prominent **How they heard about Motiion** answer and free-text detail, portfolio/readiness/review state, media/resume links and import diagnostics, meaningful activity, created projects/activities/castings/rosters and protected review affordances. Missing data remains explicit. No personal details or financial history are invented. Native details expose the existing protected native review queues.

Final validation: 11 web model tests pass, including sorting, missing-date placement, preserved directory state, historical boundaries, duplicate event users and unavailable sources. TypeScript and targeted ESLint pass. Native model checks and the full iOS Demo arm64 simulator build pass (`/tmp/motiion-launch-directory-build.log`); native UI runtime was not exercised. Browser checks verified 50-row pagination, oldest/newest/name controls, Talent page-two return state, Industry search/sort return state, direct detail reload, a 307 login redirect for an unauthenticated detail request, actual Back to app navigation, 390px chart-first layout, keyboard table scrolling with sticky header and no page-level horizontal overflow. No review decisions were submitted during UI verification.

Final screenshots: `admin-launch-white-talent.png`, `admin-launch-white-overview.png`, `admin-launch-white-detail.png`, `admin-launch-white-mobile.png`, and `admin-launch-white-detail-mobile.png`. Earlier dark screenshots are superseded. Local server remains at port 3001. These revisions do not change database records, staging credentials, or production deployment.


### Header identity refinement

The sidebar now starts with a plain left-aligned Admin label. A single 110px canonical wordmark replaces the old Motiion workspace / Launch operations box contents. The top-right MT was a placeholder; it is now supplied exclusively from the profile returned by `requirePlatformAdmin`, using its existing `avatarUrl`/headshot mapping and `fullName`. Missing or failed images fall back to that viewer's initials. Preview always uses fictional PA initials with a Fictional preview admin accessible label and never displays the signed-in viewer's photo.

Verified live viewer label/photo loading, one wordmark, 390px layout without horizontal overflow, explicit fictional preview identity, TypeScript and targeted ESLint. Screenshots: `admin-launch-header.png` and `admin-launch-header-mobile.png`. No production changes.
