# Admin website follow-up release — 2026-10-31

User authorized the accumulated website changes for production after review. Release baseline is production main 3cd0381e72434912761e46afae68086434cdd63c. The isolated release includes only approved admin code, its tests and this release note. No preview fixtures, demo accounts, credentials, test media, review decisions or native-only migration are included.

## Scope

- Failure-tolerant identity photos: Talent prefers ordered headshots; Industry prefers its own industry avatar. Same-person alternatives precede initials. Invalid URLs and failed images are skipped.
- Labeled Industry application review, matching applicant photo and acquisition context, with protected version-checked review actions.
- Overview single trend selector defaults to new profiles beside pending reviews, followed by platform totals and financial/community summaries. Recorded money remains separated by currency and unavailable sources are explicit.
- Notion-backed KPI Goals, with source links and phase context. These are an editorial snapshot reviewed October 31, not a live Notion sync; existing staff goal/history controls remain available.
- Compact Talent/Industry account pages with authoritative referral edges and deduplicated participation counts. Ownership, submissions, membership, registration and completed bookings retain distinct meanings. Missing or incomplete coverage is unavailable, never a fabricated zero.
- The approved canonical wordmark/header treatment is already present in the production baseline and remains included.

## Data and access

Production schema and migration history were inspected. All required tables and columns already exist; no production database migration is required. Existing dashboard migration remains hosted version 20261031151438. Per-account supplementary reads run server-side after requirePlatformAdmin using narrowly selected fields and per-user filters. The new native account-activity RPC is deliberately excluded.

No accounts, credentials, review decisions, analytics exclusions or goal records are changed by this release. Staging fixtures remain staging-only.

## Validation

The release is checked with 22 admin model tests, TypeScript no-emit, targeted ESLint, diff whitespace checks and a production webpack build. Desktop and 390px visual checks were completed against local preview fixtures, which are excluded from the release. Live deployment verification checks the production alias, deployment readiness and access gates. Authenticated production visual review requires the user's existing admin session; no production login is created or reset for testing.

## Rollback

Restore the preceding Ready production deployment https://motiion-app-website-qiufyz5kh-motiion.vercel.app (dpl_DgfxHRL5GQcZpy7DCD1pA4yFYfTN, commit 3cd0381). No database rollback is needed. Keep existing additive dashboard schema and any real goal/history data.

## Native

This release does not distribute iOS. The native supplementary account RPC remains locally prepared and unapplied, so those native supplementary counts remain unavailable pending a separately authorized migration/release.

---

# Admin launch dashboard production release — 2026-10-31

Release baseline: production web commit 91ad1c4. Isolated checkout contains only the launch dashboard and its review component/action dependencies. Existing application files, dependencies and environment configuration are retained from production. No staging users, credentials, fixtures or screenshots are included.

Web scope: seven admin sections, live source summaries, 7/30/90-day historical trends, 50-row talent/industry directories, rich user detail with acquisition information, protected review controls, versioned launch goals/history, explicit analytics exclusions, signed-in avatar and Back to app navigation. The unframed canonical wordmark is 92px wide with subordinate 11px Admin text to its right.

Production migration `admin_launch_dashboard` was applied once as hosted version `20261031151438` (source: `supabase/migrations/20261031142716_admin_launch_dashboard.sql`). All 22 snapshot sources were verified as an existing production admin under the authenticated database role. Anonymous execution and authenticated non-admin access are denied. The three new tables have RLS enabled. Profile checksums are unchanged; goals, history and exclusions start empty. No production review decisions or goals were created for testing. Security advisors report the expected authenticated SECURITY DEFINER exposure; each new RPC explicitly checks the existing trusted platform-admin authority.

Validation: 11 dashboard model tests, TypeScript no-emit, targeted ESLint, production Vercel build. Browser access without a production session redirects to login. Authenticated visual testing was performed in staging; production authenticated browser verification requires the user's existing production session.

Rollback: restore previous Ready production deployment `motiion-app-website-bugu22g4v-motiion.vercel.app`. Keep the additive migration in place so any real goal/history data is preserved; the previous app does not use the new objects. Do not drop production tables as part of a web rollback.

Native: shared database contract is live, but this web release does not distribute the iOS UI. Native model tests and the Demo simulator build passed during implementation. A separately signed archive and TestFlight/App Store distribution are still required; no automated native release workflow was found in this checkout.

## Completed production outcome

Commit `3cd0381e72434912761e46afae68086434cdd63c` was pushed to production `main`. Git-triggered deployment `dpl_DgfxHRL5GQcZpy7DCD1pA4yFYfTN` reached READY; Vercel inspection of `https://www.motiion.app` resolves to that deployment. Immutable deployment URL: https://motiion-app-website-qiufyz5kh-motiion.vercel.app . Live dashboard: https://www.motiion.app/admin/analytics .

Live HTTP checks: home and login return 200; admin overview and user-detail routes return 307 to login with the intended next route preserved. The live wordmark SHA1 matches the canonical asset (`3b98a03707d6f17b9fcb47aa87c8ce27ae37beed`). All three mutation RPCs reject authenticated non-admin callers in rolled-back denial tests. No production browser session was available, so signed-in production visual verification is not claimed.
