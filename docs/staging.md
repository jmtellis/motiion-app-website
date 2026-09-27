# Industry workflow staging

Production Supabase: `pygdxcscmebeqjxhzzuq`.
Industry staging Supabase: `mvkvztpvakybrhyupown` (`industry-staging`).

The App Store app and production website stay connected to production. Local development and website previews must use staging credentials, including the server-only service-role key. Staging accounts are separate accounts; production credentials and customer records must not be copied.

## Configuration

Use `.env.staging.example` as the local configuration template. Set the staging project's anon and service-role keys privately. For a hosted preview, set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to its HTTPS origin and configure that origin's `/auth/callback` in staging Supabase Auth. Allow `http://localhost:3001/auth/callback` for local testing too.

Vercel Production uses `NEXT_PUBLIC_APP_ENV=production` and production credentials. Vercel Preview uses `NEXT_PUBLIC_APP_ENV=staging` and staging credentials. Deploy after changing environment variables: browser variables are built into the website.

Next startup/build checks reject production Supabase URLs in local/preview environments, staging Supabase in production, live Stripe keys in test environments, and test configuration pointing callback/share URLs at the live website. Supabase client creation also checks isolation at runtime. Staging displays a test banner and requests that search engines not index it; this is not access control.

## External services

Start with payments, email, push notifications, analytics, and external syncs disabled. Use Stripe test keys and a separate test webhook when enabling payments. Website notification emails require an exact `STAGING_EMAIL_ALLOWLIST` match; an empty list blocks them all. Supabase Auth emails and Edge Function emails are separate and need their own staging settings.

Before enabling test workflows, inspect staging Edge Function secrets, database webhook destinations, scheduled jobs, and Vault secrets. Do not copy production APNs, SMTP/Resend, Stripe, RevenueCat, Notion, or webhook credentials. Configure test-only recipients before enabling any delivery. Storage bucket definitions/policies and backend functions must exist; production uploaded files and user data are unnecessary.

## Verification and release

Run `npx tsx --test scripts/environment-isolation.test.ts`. Verify that the staging database has no production users, create a test industry account and test talent account, and exercise casting/event publishing against staging only. Check that records exist in staging and remain absent from production. Verify both server and browser requests use the staging hostname.

Release application changes and reviewed migrations through the normal production release process. Never merge or copy test records into production. Keep the staging branch persistent if it will be reused, and do not merge it into production merely to deploy frontend changes.

## Provisioning status

The staging branch was created on 2026-09-26 with approval for its displayed $0.01344/hour compute cost (approximately $9.68 per 30 days, before usage/taxes). Account authentication, backend verification, local credential switching, and a hosted preview must be completed before treating staging as ready for testing.
