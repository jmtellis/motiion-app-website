# Website improvement backlog

Use with [the journey map](journey.md). This is an initial code-informed review, not a claim that every flow has been audited. `Observed` means the code or a test supports the finding. `Investigate` means measure or reproduce before changing it. Priorities describe the recommended order; they are not release promises.

## First priorities

| ID | Priority / state | Finding or question | Evidence | Proposed work and acceptance |
| --- | --- | --- | --- | --- |
| ENG01 | P0 / staging verified | Staging Auth SMTP had no inbox-only gate; application/team workers had no staging recipient override | Auth config and both delivery handlers inspected 2026-11-15 | Signed staging-only Auth hook; shared strict recipient routing; disable direct SMTP fallback; test all three paths and missing config; never send to copied talent addresses |
| ENG02 | P1 / observed | Project list waits for all data before rendering; its Suspense boundary wraps an already-loaded child and has a null fallback | `src/app/(buyer-app)/(paid)/projects/page.tsx`; no project `loading.tsx` | Put meaningful loading boundaries around actual asynchronous work; preserve stable page chrome; measure warm navigation and loading feedback |
| ENG03 | P1 / observed | Auth/profile lookup is request-memoized, but the hiring/approval guard can run again in layout and page | `src/lib/auth/session.ts`, paid layout and project page | Trace query counts; dedupe request-local role/approval checks where safe; never cache them across users; verify changed/revoked access still takes effect |
| ENG04 | P1 / observed | Checkout pending state relies on a manual Check again link | `src/app/checkout/success/page.tsx` | Review bounded automatic confirmation checks, clear timeout/retry messaging and accessible pending feedback; verify delayed webhook, cancelled/failed payment and reload; preserve server-verified billing |
| ENG05 | P1 / investigate | Project hub composes casting, role, roster and activity queries; some independent reads are already parallel | `src/lib/talent-buyers/projects-hub.ts` | Measure query counts/response sizes at realistic scale; defer secondary previews and bound pagination where needed; avoid speculative whole-app caching |
| ENG06 | P1 / investigate | Application drafts, auth return paths, and payment return each cross state boundaries | Application form, verify-code handler, auth callback, checkout success | Walk refresh/back/reopen with two accounts; retain intended destination; prevent another account's draft or invitation from being applied |
| ENG07 | P1 / investigate | The paid-capacity and seat limits span UI, webhooks and SQL | `project-creation-access`, `project-sync`, team-seat checkout and billing migrations | Add end-to-end cases for first pass, monthly capacity, fourth seat, simultaneous invites, expired/revoked passes, and refund events; keep tests focused on durable behavior |
| ENG08 | P1 / observed design constraint | Admin/coordinator access differs substantially; job title is descriptive, not authorization | Team RPCs and `ProjectTeamWorkspace` | Make the permissions understandable at invite and acceptance; verify coordinator schedule-only access with direct requests as well as hidden controls |
| ENG09 | P1 / investigate | Casting finalization and confirmations are distinct actions | Finalize RPC and booking handoff flows | Confirm user understands when choices become project People and when confirmations are actually sent; test stale selection conflicts and duplicate handoff |
| ENG10 | P2 / investigate | Loading/error coverage varies by route | Route inventory: talent loading, app loading, root/project errors; checkout/team lack equivalent route files | Establish consistent states without flattening distinct workflows; include keyboard focus, live announcements and reduced-motion behavior |
| ENG11 | P2 / investigate | Dev smoke timings include compilation and cannot establish production performance | Local requests during staging setup | Measure a production build on representative data; record cold vs warm navigation, server work, query count, response size, LCP/INP/CLS; set budgets after baseline |
| ENG12 | P2 / observed | Migration history differs between staging and canonical files; staging initialization cannot safely replay all history | `docs/staging.md` and applied prerequisite list | Create a reviewed migration inventory and reproducible staging provisioning path; never reset/merge the persistent branch to hide drift |
| ENG13 | P2 / observed | Database advisors report existing mutable search paths and broad security-definer execution grants | Staging advisor baseline from 2026-11-15 | Audit the actual public RPC permission graph in batches, starting with auth/project/billing; separate intentional API access from unsafe grants; regression-test each tightening |
| ENG14 | P2 / observed | Shared backend workers live in both the website and iOS repository | Both `supabase/functions` / `Supabase/functions` trees | Maintain identical shared sources now; choose one deployment source or automate drift checks before further backend releases |
| ENG15 | P2 / investigate | Email acceptance, delivery, and link completion are different states | Existing queue retries and provider calls | Track delivery and failures without logging tokens or personal payloads; verify retry windows and idempotency; distinguish queued/sent from delivered in UI |

## Product polish checks to run with Jay

These are checks, not assumed defects: mobile menu and centered branding; signup intent clarity; password autofill and email-code paste; readable review status; helpful empty projects; pricing and owner-covered team access; draft/published distinctions; consistent headshots and filters; selected vs confirmed dancer states; date and timezone clarity; destructive-action recovery.

## Definition of done for each change

- The original user note is satisfied and the affected journey step is re-tested.
- Loading, error and retry behavior fit the operation; the user never sees success before durable work is saved.
- Permissions, billing and account identity are enforced on the server/database.
- Query and render changes are measured where performance is the stated problem.
- Relevant tests/typecheck pass; any remaining limitation is recorded.
- Documentation reflects the resulting behavior. Record production release separately from local/staging verification.

## Reference guides used

- [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook): signed Auth delivery customization.
- [Resend sent email list](https://resend.com/docs/api-reference/emails/list-emails): provider delivery status verification.
- Next.js 16.4.4 installed documentation: `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` and `10-error-handling.md`. Recheck the installed version when changing data loading or error boundaries.

### Application qualification questions — implemented in staging

Added three structured fields with Not sure choices (now required for website continuation and submission): projects running at once (1 / 2–3 / 4–5 / 6+), frequency (one-off / occasional / ongoing), and project management team size including self, excluding cast (1 / 2–3 / 4–10 / 11+). Includes draft hydration, server validation, staging persistence, admin review, account context and application preview. Blank and Not sure remain distinct. Future work: an editable plan suggestion after approval, with duration and seat add-ons considered at checkout; no automatic plan assignment is implemented. Keep collaborator disciplines for project invites unless a concrete onboarding use requires them.

### Application preview density — resolved locally

Reserved separate grid rows for the heading, content and footer, and tightened section/header spacing while retaining the same type size, fixed Letter dimensions and existing value truncation. Verified all four populated sections, including multiline notes, clear the footer in Dia.

### Submission confirmation polish — implemented locally

Constrained confirmation content and action widths, consolidated status copy with email next steps, and unified immediate receipt/persisted pending messaging. Refresh retains a spinner and text label. Jay confirmed receipt arrival in the staging inbox. Receipt remains plain text with a status link; consider branded HTML after copy/layout feedback.

### J07 — direct plan checkout and purchase summary

Plan continuation on approval now opens Stripe directly, retaining the button spinner through setup, session creation and navigation. Other /checkout links auto-start with a status spinner and retry on failure; removed the redundant confirmation page. Cancel returns to approval plan choices or pricing rather than restarting checkout. Existing saved auth-return destinations still take precedence. Versioned checkout presentation prevents reuse of old cancel URLs; server approval, price validation, duplicate subscription checks and verified fulfillment remain in place.

Hosted Checkout uses Motiion branding, a dark summary column, and plan-specific duration/renewal text near payment. Updated only the three Stripe test product names/descriptions to show project/team capacity, casting and coordination. Reproducible test-only copy script: scripts/staging-checkout-copy.ts (dry-run default, --apply to update). Production catalog copy still needs a deliberate release step. Hosted Checkout owns the column layout; a fully custom feature list would require an embedded/custom checkout.

TypeScript, targeted ESLint and 13 existing billing/recommendation tests passed. Verified approval-to-Stripe navigation in Dia without the intermediate confirmation, and the Project Pass price/summary in Stripe sandbox. No payment submitted.

### J06 — workspace entry defaults to Discover / Explore

Changed exploration progress copy to “Opening workspace…”. Industry default auth/workspace destination and /dashboard now resolve to /talent (Discover). Explicit project/invitation destinations remain intact. Explore precedes Featured in shared Discover tabs, and both industry and talent Discover routes default to Explore; explicit Featured/Saved/list URLs remain supported. Updated default navigator data loading and route skeletons to match Explore.

Verified /dashboard reaches Discover and the Explore grid renders first in Dia. A development hot-reload streaming failure left the initial verification on a skeleton; restarting the local development server restored rendering. TypeScript, targeted ESLint, six existing account-navigation/recommendation tests and diff checks passed. Local/staging only.

### Discover — card actions and search overlay (local staging)

User notes: circular layout toggle; card heart opens preview instead of saving; full profile requires waiting for preview; search overlay should match the application picker with a lighter surface and footer.

Implemented: circular toggle; removed decorative hearts when no save handler exists; explicit Preview and View profile actions in navigator and browse cards. Full profile links preserve the current Discover URL as their back destination and do not prefetch every visible card. Navigator controls are sibling buttons/links rather than nested interactive controls. Existing real save handlers in other navigator consumers remain available.

Search now has a bounded scrolling body, persistent light footer, Done/Escape/outside/focus dismissal, empty guidance and loading feedback. Suggestions are keyed to their query, preventing stale credit matches while typing; closed menus do not request suggestions. Search submission has pending feedback. Native tab navigation replaces the previous incomplete listbox/combobox roles.

Validation: TypeScript and targeted ESLint pass; 21 existing profile-link/search-intent tests pass. In Dia verified circular toggle, direct navigator-to-full-profile navigation, keyboard Preview opening the side panel, light search overlay and Done dismissal. Returning to Discover encountered a development streaming stall; restarting the existing local server on port 3001 restored rendering. No production deployment. Browse actions typechecked; mobile and browse visual walkthrough remain follow-up coverage.

Recommended follow-up: measure initial Discover load and independently schedule list/navigator queries (currently sequential in loadDiscoverCanvas); investigate repeated development streaming stalls. Consider a labeled list control for first-time discoverability and more visible filters for focused casting searches. Keep these separate from this card/overlay change.

### Discover — entry, portraits, idle motion and concurrent loading (local staging)

User requested a softer vignette, an animated dark-tile entry state, smooth portrait loading, idle row changes and optimized initial data loading.

Implemented a viewport-faded charcoal portrait grid with slow alternating row drift during route loading. Individual portraits keep their footprint, prioritize the active/nearby images, fade in on load and use initials on failure. Stable grid keys preserve mounted cards as they move. Replaced the stacked backdrop blurs with a single lighter radial vignette.

Idle motion starts after 12 seconds, steps every eight seconds and follows two cards right / next row / two cards left / next row. Pauses for interaction, card/search hover, keyboard focus, open detail panels/dialogs, hidden documents, reduced motion, search queries and the explicit pause control. List and Featured stay static. Timer/listener cleanup is covered by tests.

Browse and navigator reads now start concurrently alongside recent history; list mode still skips navigator data. A recent-history rejection cannot block the main results. No shared cross-user cache or authorization changes. Added deferred-promise tests for concurrency, list-only reads, optional history failure and pagination redirects. No production latency claim: the local server includes compilation/streaming variability.

Verified in Dia: dark loading tiles, completed portrait grid, lighter vignette, an automatic column advance, and pause/resume state. TypeScript and targeted lint pass; 26 targeted tests pass, including five new orchestration/idle behavior cases. Reduced-motion and hidden-tab behavior verified in the hook harness; physical mobile walkthrough remains unverified. Changes local only.

### Discover — quieter controls and direct card gestures (local)

Revised after feedback: the idle pause/play control is now a bare icon at the far right of a shared bottom row, vertically aligned to the search field. Removed both text card actions in favor of a single outlined full-profile icon revealed on hover/focus (visible on touch devices).

Single click/tap previews; double click/tap opens the full profile; Enter opens the focused card or current navigator profile when focus is outside controls. Shared gesture handling serves navigator and browse cards, delays pointer previews 300ms to distinguish double taps, and cancels pending previews on navigation/unmount. Existing non-Discover navigator consumers retain their prior double-click behavior.

Route tiles and portrait placeholders now use a light grey shimmer. Removed skeleton row drift so placeholders remain aligned with the loaded grid. Reduced-motion support remains.

Verified in Dia: bottom-right icon alignment, hover icon visibility, single-click preview, double-click full profile, and Enter full profile. The refreshed page loaded too quickly to capture the route skeleton in this pass; static styling reviewed. TypeScript, targeted lint, and seven targeted tests (gesture, idle, loader) pass. Local only.


### Discover — profile preview loading and actions (local staging)

Added a persistent Profile preview header with close and outlined full-profile controls, available during loading and errors. The loading view immediately uses the selected card’s known portrait, name and location, with light stationary shimmer placeholders for actions and details. Portraits fade in with an initials fallback on failure. Removed the redundant content slide-in; reduced-motion preferences remain respected.

Preview actions use compact Favorite and Share icons, a labeled Message button and More. Favorite explicitly shows pending status and remains disabled until its state is known. The large full-profile footer is replaced by the persistent header link for Discover. Wrapped detail rows and badges accommodate narrow panels. Profile details requests reuse the same in-flight promise during development effect replay, and optional view-recording failures cannot break profile loading.

Validation: TypeScript, targeted ESLint, nine existing profile-shell/link/access tests and diff checks passed. Dia’s accessibility state confirms the loaded preview, header navigation and compact actions. Screenshot capture continued showing a stale Discover canvas, so final visual animation inspection remains unverified. Local changes only; no production deployment.


### Discover — full-profile continuity (local staging)

Added profile-shaped light shimmer loading boundaries to both Discover and industry Talent profile routes, retaining the safe return destination while data loads. Full-page actions now use the same compact Favorite/Share, Message and More arrangement as the preview. Preview-to-profile navigation keeps the panel in place until route replacement, prefetches only the selected preview destination, and shows pending feedback on its header link. Removed the rising page transition in favor of a short content fade, with reduced-motion support.

Removed the full-profile wheel cancellation handler that blocked native scrolling outside the detail column, including on narrow layouts. Desktop scroll containment remains CSS-driven. Blocking a profile returns to the supplied Discover destination instead of relying on browser history. Full profile menu, focus outlines and narrow-layout portrait corners match the preview.

Validation: TypeScript and nine existing profile-shell/link/access tests pass. New loading components, preview navigation and route files pass ESLint; the existing full-profile client still reports its pre-existing memoization and set-state-in-effect findings. Diff checks pass. Dia exposed only browser chrome during this pass, so visual transition and responsive walkthrough verification remain outstanding. Local only.


### Discover — edges, trackpad and quick-profile design

User requested cleaner Explore card edges, smoother corners, two-axis Mac trackpad browsing, image fading instead of a white vignette, a quick-action preview, and improved full-profile chrome.

Removed Discover card borders/glows and applied a viewport-fixed alpha mask to the image layer only; controls remain unmasked. Added progressive CSS superellipse corners for cards, portraits and workspace panels, with rounded fallback in unsupported browsers. Wheel input accumulates small deltas, selects the dominant axis, and consumes momentum until the next gesture. Pinch zoom, open preview panels and dialogs are excluded.

Preview now has an inset portrait rounded on every corner, compact actions and explicit Headshots / Resume controls. Credits, work details and highlights are absent from the preview. Resume opens the shared dismissible sheet with experience/training and a validated document link when present, or an empty state. Loading placeholders match this smaller layout. Full-profile back chevron sits beside the name with top spacing; representation/social badges move below the portrait. Non-union is plain text. Sticky resume labels and data rows have matching horizontal padding.

Validation: TypeScript, targeted lint and 10 Discover tests passed, including new gesture accumulation, momentum suppression and wheel-unit tests. Diff check passed. Existing full-profile client lint findings from the preceding entry remain. Dia still exposed only browser chrome even after raising its window; visual and real-trackpad verification remain outstanding. No deployment.


### Workspace — mobile navigation parity with marketing

The industry workspace used its own title toolbar and left-side desktop navigation drawer, while talent used a separate left-toggle light header. Both now use TalentMobileHeader with the marketing header classes, canonical centered wordmark, right-hand toggle, dark full-width dropdown and 44px toggle target. Workspace navigation and account controls remain available in the dropdown. The industry drawer and duplicate hamburger/title toolbar are removed; desktop sidebar behavior remains. Mobile outer frames and canvas corners are flattened. Escape returns focus to the toggle; outside pointer input, navigation and desktop resizing close the dropdown. Moved the local staging badge away from the hamburger.

Validation: TypeScript, targeted ESLint, four existing account-shell tests and diff check passed. Actual mobile visual/dropdown walkthrough is not verified because Dia page inspection was unavailable during the session. Local only.


### Discover — phone grid, search and preview

Added phone-specific 200×266 portrait grid metrics shared by rendering and slide offsets. Touch swipes navigate on the dominant axis, ignore short movement and suppress accidental profile clicks after dragging. Pinch zoom remains available. Phones do not run idle motion; desktop trackpad and keyboard behavior remain. Neighboring portraits peek beside the focused card; desktop arrows are hidden on phones.

Search moves into a separate full-width row below the mode controls, with 16px text, a short prompt, 44px submit/clear targets and an icon submit control. The mobile row omits voice controls to leave room for typing. Suggestions open below search, use the visual viewport to stay above the keyboard, and keep a reachable Done control. Search submission dismisses the keyboard. Phone previews use a rounded bottom sheet with safe-area padding, smaller portrait and 44px actions. Removed stale fixed-chrome/staging offsets for the revised phone layout.

Validation: TypeScript, targeted ESLint and 11 targeted Discover tests (including swipe directions/tap jitter) pass. Dia still exposes browser chrome only, so physical-phone swipe/keyboard behavior and visual layout remain unverified. Local only.


### Discover — continuous gestures and mobile full profile

Corrected the one-step-per-gesture wheel policy: ongoing scroll now advances at a paced interval and can change direction without a mouse move or an idle gap. Touch drags can also advance repeatedly while the finger remains down. Added a slide-lock timeout fallback so a missed/interrupted transition event cannot permanently block navigation.

Embedded mobile profiles use one scrolling column, a sticky inline back/name header, shorter rounded portrait, horizontal headshot swipes, 44px actions and stacked resume entries with explicit Role/Credit labels. Desktop resume columns remain. Profile return URLs preserve the existing query and carry a selected talent ID; Discover restores focus to that person when present in the results.

Validation: TypeScript, targeted lint and 12 Discover regression tests pass, covering continuous wheel movement, axis changes, swipe directions and missing-transition recovery. Full-profile client retains the previously noted lint findings outside this change. Dia page inspection remains unavailable; physical-phone layout, headshot swipes and trackpad feel remain unverified. Local only.


### Discover — one move per swipe correction

Replaced repeated movement within a gesture with a consumed-gesture gate. A touch advances once between pointer-down and release; movement and release share the same gate. A wheel burst includes its momentum and advances once, rearming after 180ms without wheel events. Consecutive gestures do not require mouse movement. Retained slide-lock recovery so missing transition events cannot block subsequent swipes. Regression coverage includes long wheel momentum, successive gestures, touch movement plus release, and slide-lock recovery. Local only; physical-device verification remains outstanding.


### Discover — repeated trackpad gestures without cursor movement

The idle-gap-only wheel gate also suppressed a fresh swipe arriving during the previous inertia tail. Added fresh-impulse recognition after deceleration and deliberate direction-change recognition after the slide interval, while continuing to suppress the existing momentum stream. Moved wheel capture to a stable window listener scoped by current hit-testing to the grid; callback updates no longer reinstall the listener as cards move beneath the cursor. Open dialogs, previews, off-grid controls and pinch zoom remain excluded. Touch remains one step per contact gesture.

Validation: TypeScript, targeted lint, diff check and 10 gesture/slide/card tests pass, including fresh same-direction input during inertia and axis changes without a quiet gap. Physical trackpad behavior remains unverified because live page inspection is unavailable.


### Discover — actionable professional preview

Reframed preview around relevance and saving instead of a condensed resume. Save to roster is prominent for industry users (Save to list for talent/community); existing roster membership is visible and refreshed when the picker closes. Existing authorized picker/create/membership flows and Pro gating remain. Portrait is smaller, and the full profile owns resume/experience. Headshots and Full profile & resume remain secondary links.

Added a nonblocking relevance section using the existing authenticated open-role action (recent owned projects). Shows exact style/skill overlap, with named evidence, no suitability score and no demographic matching. Supports loading, retry, empty states and links to project castings. Existing search evidence appears separately as Why this appeared. Shared-client/roster-collaborator intersections are not implemented: they require a dedicated permission-scoped relationship lookup and accurate wording distinguishing shared credits from direct collaboration. No inferred connections or placeholder match cards are presented.

Validation: TypeScript, targeted lint and 10 role-overlap/profile-shell/roster-access tests pass. No roster writes were performed during verification. Live role retrieval and visual layout remain unverified due the ongoing browser inspection limitation. No database or deployment changes.


### Discover — scoped profile actions and quiet role links

Removed generic Message actions and the profile message composer from preview/full-profile surfaces, plus Contact buttons on legacy industry profiles and navigator panels. Project messaging flows remain unchanged; this change removes profile initiation surfaces, not a global messaging backend policy. Save to roster/list, Favorite, Share and More now share one row in preview and embedded full profiles. Removed helper copy; existing membership is retained in the save control tooltip and roster picker.

Relevant open-role overlaps render only as compact linked action rows matching Headshots / Full profile & resume, with project/casting and explicit shared-tag evidence. Removed the section title, loading text and no-role empty states. No suggestion UI is rendered for no overlap or unavailable optional role data.

Validation: TypeScript, targeted lint and 10 role-overlap/profile-shell/access tests passed. No messages or roster mutations were sent. Visual verification remains outstanding. Local only.


### Discover — preview follows manual navigation

Opening a grid profile centers that person and makes the preview track the active grid cell. Manual wheel, swipe and grid-keyboard navigation remain available with the desktop preview open and update its content. Search results outside the current grid start following the center on manual navigation. The outer preview panel stays mounted as users change, while its profile content retains per-person request cancellation. Native modal sheets on phones continue to make the background inert.

Idle motion is disabled while preview selection exists; the motion control shows its paused state and cannot resume automation until the preview closes. Replaced the separate selected-card dot with a checkmark in the existing full-profile shortcut; its accessible label describes the selected state and retained full-profile action.

Validation: TypeScript, targeted lint and 13 gesture/idle/preview/card tests pass, including a component-level regression for opening a preview, changing center, keeping idle paused and resuming only after closure. Visual verification remains outstanding. Local only.


### Discover — close-only preview header

Removed the visible Profile preview title, header divider and duplicate full-profile shortcut. The header keeps only its close control; the panel retains its accessible name and the body’s Full profile & resume action. Targeted lint, TypeScript and diff checks passed.


### Workspace — stacked upgrade banner and release validation

Moved the upgrade action beneath the banner text, with a full-width centered button so the copy can use the full banner width.

Release validation: all 525 tests pass, TypeScript passes, and diff whitespace checks pass. Changed-file lint reports three existing errors and one existing warning in the public profile client, verified against the previous release; no new lint findings. Browser visual verification remains outstanding. This release includes the accumulated Discover, profile, gesture and mobile workspace improvements above.
