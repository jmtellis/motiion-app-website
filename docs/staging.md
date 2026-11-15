# Industry workflow staging

Production Supabase: `pygdxcscmebeqjxhzzuq` (also `api.motiion.app`).
Industry staging Supabase: `mvkvztpvakybrhyupown` (`industry-staging`).

Staging website: https://motiion-industry-staging.vercel.app
Local source branch: `main`. The separate hosted staging preview uses `codex/industry-staging`; it is not automatically updated by local work on main.
Local test-account credentials: `.staging/accounts.md` (private; excluded from Git and Vercel uploads).

The App Store app and production website stay connected to production. Local development and website previews must use staging credentials, including the server-only service-role key. Staging accounts are separate accounts; production credentials and customer records must not be copied.

## Configuration

Use `.env.staging.example` as the local configuration template. Set the staging project's anon and service-role keys privately. For a hosted preview, set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to its HTTPS origin and configure that origin's `/auth/callback` in staging Supabase Auth. Allow `http://localhost:3001/auth/callback` for local testing too.

Vercel Production uses production credentials and is recognized automatically by `VERCEL_ENV=production`. The `codex/industry-staging` Preview branch uses `NEXT_PUBLIC_APP_ENV=staging` and staging credentials. Other branches need their own isolated Preview settings before building. Deploy after changing environment variables: browser variables are built into the website.

As of 2026-11-15, local `.env.local` uses staging anon and service-role credentials, localhost callback URLs, Stripe test keys, and both local-production overrides set to `0`. The previous configuration is preserved privately at `.staging/env-before-staging-20261115.private`; it is not loaded by Next.js. Both Git and `.vercelignore` exclude these private files. Prefer Git-based preview deployments. Never promote a staging deployment to Production.

Talent home can optionally read the live public catalog without switching the app onto production. Set `CATALOG_SUPABASE_URL`, `CATALOG_SUPABASE_ANON_KEY`, and `CATALOG_SUPABASE_SECRET_KEY` in `.env.local` only. Those reads are filtered GETs for featured collections, public events, accepted cast, and public profiles, and they are disabled when `NEXT_PUBLIC_APP_ENV` is production. Sign-in, projects, and writes stay on staging. Do not add the catalog secret to the hosted staging project unless that preview should show the same public cards.

Next startup/build checks reject production Supabase URLs in local/preview environments, staging Supabase in production, live Stripe keys in test environments, and test configuration pointing callback/share URLs at the live website. Supabase client creation also checks isolation at runtime. Staging displays a test banner and requests that search engines not index it; this is not access control.

## External services

Local Stripe test payments are enabled. Project Pass ($199), Studio ($149/month), Production House ($499/month), and additional seats ($15/month or $39/pass) use verified test-mode prices. A local Stripe listener forwards test events to `/api/webhooks/stripe`. Website notification emails require an exact `STAGING_EMAIL_ALLOWLIST` match; an empty list blocks them all. Supabase Auth and Edge Function email delivery are separate: Auth currently enables email/password and Google sign-in, requires email confirmation, and permits signup. The industry/team delivery configuration keeps email and push disabled in staging. Do not enable it for copied profiles or copy production delivery credentials.

Before enabling test workflows, inspect staging Edge Function secrets, database webhook destinations, scheduled jobs, and Vault secrets. Do not copy production APNs, SMTP/Resend, Stripe, RevenueCat, Notion, or webhook credentials. Configure test-only recipients before enabling any delivery. Storage bucket definitions/policies and backend functions must exist; production uploaded files and user data are unnecessary.

## Verification and release

Run `npm run test:environment`. Two fictional accounts and a clearly labeled sample casting/event are available in staging. Authenticated staging writes and talent reads were verified, and their record IDs were confirmed absent from production. The Projects and Events pages were verified with an authenticated website session. Both server and browser requests must use the staging hostname.

Release application changes and reviewed migrations through the normal production release process. Never merge or copy test records into production. Keep the staging branch persistent if it will be reused, and do not merge it into production merely to deploy frontend changes.

## Provisioning status

The persistent staging branch was created on 2026-09-26 with approval for its displayed $0.01344/hour compute cost (approximately $9.68 per 30 days, before usage/taxes).

Supabase's automatic migration replay failed. Staging was repaired transactionally from a current production **schema-only** snapshot with the production push webhook removed. No production user records, uploaded files, Vault secrets, or custom Edge Function secrets were copied. Staging has 135 public tables plus 3 views, 16 empty storage buckets, matching storage policies, and realtime enabled for the same 15 application tables. Three database-generated link functions use the staging origin.

The historical migration replay issue remains separate work. Do not reset this branch or use automatic migration replay/branch merging as a deployment shortcut; it could recreate the initialization failure or apply unintended schema changes. Apply reviewed migrations explicitly to staging, test them, then release the same changes to production through the normal process.

## Local polish workflow (2026-11-15)

Start the website with `npm run dev` and open http://localhost:3001. Keep a separate test webhook terminal running:

```sh
stripe listen --project-name motiion-parity-test --forward-to http://localhost:3001/api/webhooks/stripe
```

The listener signing secret must match `STRIPE_WEBHOOK_SECRET` in `.env.local`; restart the website after changing it. Never add `--live`. Test Checkout accepts `4242 4242 4242 4242`, any future expiration, and any three-digit CVC. Real production purchases and accounts are separate.

Sample credentials are stored only in `.staging/polish-sample-accounts.private.json`. The producer account has test-paid project capacity and sample work; the checkout account is approved but unpaid so the pay-before-project flow can be exercised. Use a fresh signup to exercise onboarding and application review. Imported talent copies use new auth IDs and undeliverable test email addresses. Names, headshots, and recorded gender remain paired; missing gender stays missing. Headshots are copied into staging storage. No production passwords, payment/customer IDs, contracts, private messages, dates of birth, or contact addresses are copied. Sample project content is fictional.

The latest industry receipt, paid project creation, team invitation, coordinator, and seat-capacity migrations and their missing prerequisites were applied explicitly to staging. Both delivery workers were deployed, with outbound delivery still disabled. This is not a full reset or automatic replay of historical migrations.
