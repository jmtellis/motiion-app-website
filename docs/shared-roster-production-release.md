# Shared roster production release — 2026-10-31

Production main commit: 3fa734c. Isolated checkout based on c7d0f16; unrelated local edits excluded.
Deployment: dpl_HQZn1BwzgqMTr4YnyUCacCs3yeRt (READY).
Canonical route: https://www.motiion.app/roster/{token}
Immutable deployment: https://motiion-app-website-ienacx2wx-motiion.vercel.app

The approved standalone viewer is served by a Next route handler, using deployment-owned public Supabase configuration. Assets are under public/shared-roster. No demo configuration or fixtures are shipped. The production iOS share URL already targets this route; the DEMO build intentionally retains its staging URL. This website deployment does not distribute a new native binary. Existing website collection links under /shared/collection are a separate, unchanged flow.

Production database migration roster_public_links_release contains the four roster_public migrations checked into this release, applied together. Do not reapply those four to production. Link-table access is owner-scoped by RLS; anonymous callers can only use the random-token endpoint. Profiles are loaded through the existing public talent view, which excludes private and incomplete profiles. Revoked access is checked every 30 seconds while visible, on returning to the page, and at expiration. Public profile links use stable user IDs.

Validation: JavaScript syntax, TypeScript no-emit, targeted ESLint, PGlite owner/nonowner/token/expiry/revocation tests, Vercel production build. Live anonymous API returned null for an unknown token and denied link-table enumeration. Three existing public profile URLs returned 200. Production HTML has no staging reference; no-store/noindex/no-referrer headers verified; all five live runtime assets exactly match source. Production invalid-token UI verified in browser. Approved demo roster rendered with release assets locally; mobile quick view, fixed action, portrait expansion and return checked.

Limitation: automatic approval review rejected a new temporary share for a real production roster, including a rolled-back version. No link or roster data was created or changed by those attempts. Explicit user approval is pending for that final live happy-path test. Security advisors flag intentional token-authorized SECURITY DEFINER execution; no new table RLS issue was reported. Relevant guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

Web rollback: restore prior READY deployment https://motiion-app-website-9go166ja4-motiion.vercel.app . Preserve the additive database objects and any real share data.
