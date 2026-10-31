# Admin launch dashboard production release — 2026-10-31

Release baseline: production web commit 91ad1c4. Isolated checkout contains only the launch dashboard and its review component/action dependencies. Existing application files, dependencies and environment configuration are retained from production. No staging users, credentials, fixtures or screenshots are included.

Web scope: seven admin sections, live source summaries, 7/30/90-day historical trends, 50-row talent/industry directories, rich user detail with acquisition information, protected review controls, versioned launch goals/history, explicit analytics exclusions, signed-in avatar and Back to app navigation. The unframed canonical wordmark is 92px wide with subordinate 11px Admin text to its right.

Production migration `admin_launch_dashboard` was applied once as hosted version `20261031151438` (source: `supabase/migrations/20261031142716_admin_launch_dashboard.sql`). All 22 snapshot sources were verified as an existing production admin under the authenticated database role. Anonymous execution and authenticated non-admin access are denied. The three new tables have RLS enabled. Profile checksums are unchanged; goals, history and exclusions start empty. No production review decisions or goals were created for testing. Security advisors report the expected authenticated SECURITY DEFINER exposure; each new RPC explicitly checks the existing trusted platform-admin authority.

Validation: 11 dashboard model tests, TypeScript no-emit, targeted ESLint, production Vercel build. Browser access without a production session redirects to login. Authenticated visual testing was performed in staging; production authenticated browser verification requires the user's existing production session.

Rollback: restore previous Ready production deployment `motiion-app-website-bugu22g4v-motiion.vercel.app`. Keep the additive migration in place so any real goal/history data is preserved; the previous app does not use the new objects. Do not drop production tables as part of a web rollback.

Native: shared database contract is live, but this web release does not distribute the iOS UI. Native model tests and the Demo simulator build passed during implementation. A separately signed archive and TestFlight/App Store distribution are still required; no automated native release workflow was found in this checkout.
