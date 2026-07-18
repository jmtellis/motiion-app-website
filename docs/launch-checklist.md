# Launch checklist — Motiion LA beta

## Environment (Vercel production)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server only)
- [ ] `NEXT_PUBLIC_SITE_URL` = production domain
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `REVENUECAT_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

## Supabase

- [ ] All migrations through `0011_subscriptions.sql` applied
- [ ] RLS enabled on all public tables
- [ ] OAuth redirect URLs include production `/auth/callback`
- [ ] Storage buckets + policies for headshots
- [ ] Realtime enabled for `messages`, `notifications`

## Webhooks

- [ ] Stripe → `https://<domain>/api/webhooks/stripe`
- [ ] Stripe webhook events include: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `identity.verification_session.verified`, `identity.verification_session.requires_input`
- [ ] RevenueCat → `https://<domain>/api/webhooks/revenuecat`

## Data

- [ ] Run `scripts/seed-la-beta.ts` with `SEED_OWNER_USER_ID`
- [ ] Verify at least 3 live LA castings + 1 activity
- [ ] Verify threshold of verified talent profiles

## QA

- [ ] Complete `docs/qa-checklist.md` on production
- [ ] Admin can verify a profile per `docs/verification-runbook.md`

## Monitoring

- [ ] Sentry receiving errors
- [ ] PostHog funnel events for North Star metrics
- [ ] Admin analytics dashboard loads KPI data
