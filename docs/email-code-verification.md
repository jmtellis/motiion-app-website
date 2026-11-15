# Email code verification rollout

Signup now uses a code entered in the original app or browser. Email/password login is unchanged. The shared confirm-signup template must be updated before releasing the clients.

In Supabase Authentication → Emails → Confirm sign up, set the subject to **Your Motiion verification code** and the body to `supabase/templates/confirmation.html`. It displays `{{ .Token }}` and keeps a secondary confirmation link for older clients. Do not change recovery or email-change templates, email confirmation requirements, OTP expiry, or rate limits.

The template and subject were applied to the production Supabase project on November 14, 2026, and verified in the dashboard preview/saved state. The website release is deployed to production; the iOS source changes remain local. A successful delivered-email end-to-end check is still outstanding.

`POST /auth/verify-code` verifies the code in this browser, establishes session cookies, bootstraps the correct signup lane, and saves an account-bound return cookie when onboarding is needed. Both check-email pages preserve `next`; signup metadata recovers a missing return path. Invalid/expired codes stay on the form; a profile-setup failure can retry without consuming the code twice. Casting signup uses the same form.

Checks: `npm run typecheck`; scoped ESLint; `node --import tsx --test scripts/email-verification.test.ts scripts/auth-continue.test.ts scripts/auth-journeys.test.ts` (22 tests).

Before release, check delivered-code signup for talent and industry, resend/expired codes, unchanged password login, and return to a casting/activity after onboarding. Read the email on another device and enter the code on the original screen. Run the same flow in the iOS app. Legacy email links remain supported during rollout.

## Production deployment — November 14, 2026

- URL: https://www.motiion.app
- Deployment: `dpl_6CdVbbnDAqNP3QF5hPwY58kEicnb` (READY, production, Next.js)
- Build: https://motiion-app-website-dsfs1e6et-motiion.vercel.app
- Source: production base `70ca933963993b8c70cea078e92126cd66eb59d6` plus the email-verification changes, packaged in `/private/tmp/motiion-email-code-release-n7x3fj6u`. Unrelated pending design edits were excluded, including unrelated hunks in signup-form.tsx. No Git commit or push was made.
- Built with production settings, checked while staged, then promoted. Build duration: 1m 3s.
- All 22 auth tests and TypeScript passed on the isolated release. Staged and live HTTP checks passed for both verification pages, password login, malformed/invalid codes (400), and cross-origin rejection (403). An unauthenticated public GET independently confirmed the live code-entry screen.
- No database migrations or Supabase Edge Functions are required. The `/auth/verify-code` server function shipped in the Next.js deployment. The shared signup email template was already saved in Supabase.

## Full website release — November 14, 2026

The user subsequently requested deployment of all pending website changes. Production now serves deployment `dpl_9qXnKmAc5qNUpCVA3w1p5RMH7v19` at https://www.motiion.app (build URL: https://motiion-app-website-oz9stlssp-motiion.vercel.app).

This release includes the entire current website working copy, including the shared marketing header/navigation, new header CSS, signup layout, footer/landing adjustments, and email-code verification. It supersedes the earlier auth-only release. The release snapshot is `/private/tmp/motiion-full-web-release-1w12uggu`; all 1,788 included source files were compared with the working copy after promotion, with no changed or newly added files found. Local secrets and ignored build files were excluded.

Validation: TypeScript passed; 34 selected tests passed; production build succeeded. All 11 staged and live HTTP checks passed across home, pricing, shop, both signup lanes, both code-verification pages, password login, malformed/invalid code rejection, and cross-origin rejection. Production domain aliases were confirmed on the new deployment. No additional database migrations or Supabase Edge Functions were needed. No Git commit or push was made.
