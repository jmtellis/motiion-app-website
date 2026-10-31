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
