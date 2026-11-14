# Talent polish and local production-mode audit — 2026-11-13

## Changes

- Fixed mobile Portfolio and Calendar content sitting beneath the fixed app bar; aligned Discover offsets and safe-area spacing with the same header-height token.
- Lazy-loaded all six portfolio editors with an accessible loading status. The portfolio overview no longer eagerly includes their upload, crop, and editing UI.
- Added a shared talent route loading state instead of leaving an empty canvas while private data loads.
- Made portfolio/card hover movement pointer-specific, retaining keyboard focus and reduced-motion behavior.
- Matched mobile Settings tabs to the pill controls elsewhere in talent.
- Removed duplicate chevrons from custom Activity/Calendar selectors.
- Fixed session editor step navigation overridden into a vertical list; made it horizontally scrollable with 44px targets, removed its duplicate close action, improved cover-upload placeholder contrast, and stacked date/time fields on the narrowest phones.
- Repaired an existing build blocker in admin TrendSelector: the client directive must precede imports.

## UI verification

Authenticated as the existing user, switched through the application's talent account menu. Inspected Discover, Portfolio, Opportunities (open and invited), Activities, Inbox, Calendar, and Settings. Representative checks used 390px phone, 768px tablet, and 1440px desktop widths; session form also checked at 320px. This is not an exhaustive device/browser matrix.

Opened Headshots and the deferred Resume editor, checked Escape dismissal/focus restoration, opened/closed session creation without submitting, and scrolled its lower form fields with the footer pinned. No content, uploads, messages, or account details were submitted.

## Production-mode build

Built an isolated source copy with Next.js 16.4.4 using `next build --webpack`; ran it on localhost:3002. Used the repository's `VERCEL_ENV=preview` disconnection path, which strips live Supabase and payment credentials. Port 3001 remained the development preview. No deployment.

The automatic approval reviewer rejected building against the live backend by changing the environment declaration. Consequently authenticated production render latency and live field Core Web Vitals were not measured. These results cannot establish live production readiness.

### Route JavaScript

Unique JavaScript files referenced by each route's client-reference manifest, including shared dependencies. Gzip measured per file using Node zlib; values are bundle estimates, not observed browser transfer sizes. Lazy editor chunks are fetched when opened. The exact reduction on Portfolio was 48,226 uncompressed bytes.

| Route | Before gzip KiB | After gzip KiB |
|---|---:|---:|
| /portfolio | 300.4 | 287.8 |
| /discover | 345.1 | 345.1 |
| /schedule | 293.3 | 293.3 |
| /inbox | 313.8 | 313.8 |
| /opportunities | 282.1 | 282.1 |
| /activities | 320.7 | 320.7 |

### Browser measurements

A temporary probe in the isolated copy observed navigation timing, buffered paint entries and layout shifts, sampling three seconds after load. Probe code was not added to the repository. Local laptop CPU/network, no throttling, normal browser cache, single samples. Public pages only; disconnected backend. These are not Lighthouse scores, mobile-device benchmarks, INP measurements, or field p75 metrics.

| Route | Viewport | TTFB ms | FCP ms | LCP ms | Observed CLS |
|---|---|---:|---:|---:|---:|
| /login | 768x1024 | 36.1 | 80 | 80 | 0 |
| /services | 768x1024 | 6.3 | 80 | 80 | 0 |
| /services | 390x844 | 7.7 | 132 | 132 | 0 |

## Checks and remaining limits

- TypeScript passed; edited CSS parsed; `git diff --check` passed.
- Custom-select and website-parity suites: 7 tests passed.
- Optimized webpack build passed. Production Turbopack was not tested.
- Build emits existing Sentry warnings about `disableLogger`, `sentry.client.config.ts`, and a missing global error boundary. These should be handled in an instrumentation follow-up before relying on Turbopack builds.
- Shared route bundles remain approximately 282–345 KiB gzipped. Larger reductions need profiling of shared discovery/messaging dependencies and a real network/CPU budget.
- Authenticated production timing requires an approved production read-only run or a populated staging backend; no isolation checks were bypassed.
