# Shortlist review refresh

Published 2026-11-01: website commit `aace4b6`, Vercel deployment `dpl_FUVGZi3RL1QQKiBBE5FpgDjmA2Wh`, Supabase `shortlist-share-public` version 32. Multi-role vote validation migration applied to production.

The public `/shortlist/[token]` page now uses the shared roster’s light canvas, portrait grid, restrained typography, and brand assets. Reviewers start on a minimal name screen, then select or pass on profiles one role at a time. Role tabs and Next role preserve choices by submission ID. A separate final summary shows selected people, passed profiles, and unfinished roles, with Edit choices / Finish role actions. Only the final summary can submit. Instagram appears directly on cards and in the profile dialog. Profile dialogs support Escape, focus containment, and focus restoration.

Names are self-reported attribution, not authentication. Each review gets a random ID; retries reuse it. Separate reviewers do not overwrite the generic Client recipient’s votes. Public responses no longer expose reviewer names or IDs. No reviewer email is collected. Refreshing starts a new review; drafts are not persisted.

## Coordinated release

1. Apply `20261101235836_shortlist_multi_role_vote_validation.sql` from either repository (identical migration, apply once). It updates the existing vote-validation trigger to accept all roles in a share.
2. Deploy `Supabase/functions/shortlist-share-public/index.ts` from the iOS repository.
3. Deploy the website changes together with the function release. The old frontend expects public recipient identities, and the new frontend requires role/Instagram data and named submissions. Avoid a prolonged mixed-version rollout; clients with an old open page should refresh.

The page depends on the existing `public/shared-roster/brand-wordmark.svg` asset. No changes to share URLs or share creation are required.

## Verification

- TypeScript: `./node_modules/.bin/tsc --noEmit --incremental false`.
- Handler and helper tests: `node --test scripts/shortlist-review.test.ts` (Node 25; test reads the sibling iOS checkout’s actual Edge Function with a mock database).
- Seven tests cover Instagram URL validation, distinct role grouping, public identity privacy, named multi-role writes, retry identity reuse, invalid votes, expired links, foreign reviewer IDs, and save failures.
- Browser checks used temporary local sample data, removed after verification: desktop and 390px mobile, name entry, role navigation, profile details, Escape dismissal, all six choices across two roles, and successful submission.
- Updated browser verification: minimal name screen; Next role and role-tab navigation with retained selections; the same person selected for one role and passed for another; incomplete final summary blocks submission; editing a role from the summary preserves choices; mobile final submission succeeds.
- `shortlist-name-preview.jpg` and `shortlist-summary-mobile.jpg` show the updated flow with sample data. `shortlist-review-preview.jpg` records the earlier all-role grid.

The migration is applied in production. The owner feedback query returned HTTP 200 with no anonymous records, verifying the PostgREST joins. Live client writes and notification delivery were not exercised against real client records.

## Roster visual parity

Uses the shared marketing Lenis hook with the same roster settings (native touch and reduced motion preserved), cropped 110% fixed wordmark with end-of-scroll reveal and protected bottom spacing, green selected states, aligned card rows via CSS subgrid, and a Shortlist Review footer. The compact native dialog matches the roster's fixed portrait, separate details scroll, mobile identity and action areas, headshot lightbox, and profile navigation within the current role.

The public Edge Function now returns the sender's display name/avatar, creation time, expiration, genres, union status, and selected highlights. Sender contact details are not exposed. Expiration already existed and is still enforced on fetch/submit; the page additionally shows the remaining-time ring and disables voting at the deadline. No extra schema change is needed for these fields. The local fixture has a sample sender and a two-day deadline; the updated Edge Function is deployed in production.

## Compact review navigation

The review header now contains the project title and reviewer identity/change action. Desktop uses clickable text steps with a bold black current step; mobile uses a native step selector. The progress count remains alongside navigation. Cards open from the portrait or name, with Instagram beside the name and no redundant Profile action, portrait arrow, or cross-role note. The avatar deadline ring is green; selected talent is green. Browser checks confirmed mobile role switching retains votes, card actions remain aligned, and portrait taps still open the roster-style modal. See `shortlist-compact-mobile.jpg` for the sample-data preview.

## Success-state refinement

Selected talent and the delivered checkmark now use green; Pass remains dark gray and completion totals use normal dark text. The delivered view uses a compact, viewport-aware flex layout with an immediately visible wordmark. Browser verification found no vertical overflow at 1280×720 or 390×844. The name-entry screen is unchanged. Screenshot: `shortlist-delivered-preview.jpg`.

## Native feedback sheet

Client feedback opens a dedicated lightbox sheet for the current casting role. It groups saved choices by reviewer ID, displays reviewer names, submitted times, totals, and expandable selected/passed lists. It includes expired/inactive share results and secondary roles in multi-role shares, paginates all votes, and uses owner RLS. Loading, empty, retry, and refresh states are provided. Native changes require the next app build; no TestFlight/App Store binary was published.

Validation completed: full `Motiion Demo` generic iOS Simulator build succeeded (arm64 and x86_64); Swift feedback model tests passed; seven website/handler tests passed; isolated release TypeScript and Vercel production build passed. Production aliases `motiion.app` and `www.motiion.app` verified against the published deployment.
