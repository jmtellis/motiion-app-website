# Industry workflow staging

Production Supabase: `pygdxcscmebeqjxhzzuq` (also `api.motiion.app`).
Industry staging Supabase: `mvkvztpvakybrhyupown` (`industry-staging`).

Staging website: https://motiion-industry-staging.vercel.app
Website branch: `codex/industry-staging`.
Local test-account credentials: `.staging/accounts.md` (private; excluded from Git and Vercel uploads).

The App Store app and production website stay connected to production. Local development and website previews must use staging credentials, including the server-only service-role key. Staging accounts are separate accounts; production credentials and customer records must not be copied.

## Configuration

Use `.env.staging.example` as the local configuration template. Set the staging project's anon and service-role keys privately. For a hosted preview, set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to its HTTPS origin and configure that origin's `/auth/callback` in staging Supabase Auth. Allow `http://localhost:3001/auth/callback` for local testing too.

Vercel Production uses production credentials and is recognized automatically by `VERCEL_ENV=production`. The `codex/industry-staging` Preview branch uses `NEXT_PUBLIC_APP_ENV=staging` and staging credentials. Other branches need their own isolated Preview settings before building. Deploy after changing environment variables: browser variables are built into the website.

The existing local `.env.local` has been switched to staging. The previous production configuration is preserved at `.env.local.production-backup-20260926`; it is not loaded by Next.js. Both Git and `.vercelignore` exclude these private files. Prefer Git-based preview deployments. Never promote a staging deployment to Production.

Next startup/build checks reject production Supabase URLs in local/preview environments, staging Supabase in production, live Stripe keys in test environments, and test configuration pointing callback/share URLs at the live website. Supabase client creation also checks isolation at runtime. Staging displays a test banner and requests that search engines not index it; this is not access control.

## External services

Payments, email, push notifications, analytics, and external syncs are disabled. Use Stripe test keys and a separate test webhook when enabling payments. Website notification emails require an exact `STAGING_EMAIL_ALLOWLIST` match; an empty list blocks them all. Supabase Auth emails and Edge Function emails are separate. Staging Auth uses a disabled local SMTP destination and automatically confirms test signups. Google/Apple providers are disabled; use email/password. Password-reset emails will not arrive until a test-only email configuration is added.

Before enabling test workflows, inspect staging Edge Function secrets, database webhook destinations, scheduled jobs, and Vault secrets. Do not copy production APNs, SMTP/Resend, Stripe, RevenueCat, Notion, or webhook credentials. Configure test-only recipients before enabling any delivery. Storage bucket definitions/policies and backend functions must exist; production uploaded files and user data are unnecessary.

## Verification and release

Run `npm run test:environment`. Two fictional accounts and a clearly labeled sample casting/event are available in staging. Authenticated staging writes and talent reads were verified, and their record IDs were confirmed absent from production. The Projects and Events pages were verified with an authenticated website session. Both server and browser requests must use the staging hostname.

Release application changes and reviewed migrations through the normal production release process. Never merge or copy test records into production. Keep the staging branch persistent if it will be reused, and do not merge it into production merely to deploy frontend changes.

## Provisioning status

The persistent staging branch was created on 2026-09-26 with approval for its displayed $0.01344/hour compute cost (approximately $9.68 per 30 days, before usage/taxes).

Supabase's automatic migration replay failed. Staging was repaired transactionally from a current production **schema-only** snapshot with the production push webhook removed. No production user records, uploaded files, Vault secrets, or custom Edge Function secrets were copied. Staging has 135 public tables plus 3 views, 16 empty storage buckets, matching storage policies, and realtime enabled for the same 15 application tables. Three database-generated link functions use the staging origin.

The historical migration replay issue remains separate work. Do not reset this branch or use automatic migration replay/branch merging as a deployment shortcut; it could recreate the initialization failure or apply unintended schema changes. Apply reviewed migrations explicitly to staging, test them, then release the same changes to production through the normal process.
