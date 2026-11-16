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
