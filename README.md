# Motiion Web

Next.js 16 (App Router) web surface for [Motiion](https://www.motiion.app) — marketing, talent app, and industry (talent buyer) dashboard. Shares one Supabase backend with the iOS app.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, design tokens in `docs/design.md` |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Payments | Stripe Billing (web), RevenueCat (iOS IAP sync) |
| Analytics | PostHog + `analytics_events` table |
| Email | Resend |
| Errors | Sentry |

## App surfaces

- **`/`** — Marketing / landing
- **`/(app)/*`** — Talent app (`/home`, `/portfolio`, inbox, discover)
- **`/(buyer-app)/*`** — Industry dashboard (`/dashboard`, `/talent`, `/projects`, `/library`)
- **`/profile/[slug]`** — Public talent profiles (Universal Links + OG)
- **`/casting/[id]`** — Public casting pages
- **`/shortlist/[token]`** — Client shortlist review
- **`/admin/*`** — Platform admin (analytics, verification)

Product spec: `docs/prd.md` · Roadmap: `docs/product-roadmap.md` · Design tokens: `docs/design.md`

## Environment variables

Copy `.env.example` to `.env.local`. Required keys depend on what you're testing:

| Variable | Required for | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, data, storage | Same project as iOS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + SSR | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin analytics, webhooks | **Server only** — never `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_SITE_URL` | OG metadata, share links | e.g. `https://www.motiion.app` |
| `STRIPE_SECRET_KEY` | Checkout, portal | Test mode for local dev |
| `STRIPE_WEBHOOK_SECRET` | Subscription + Identity sync | Point Stripe CLI or dashboard to `/api/webhooks/stripe` (include `identity.verification_session.verified` and `identity.verification_session.requires_input`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout + Identity modal | |
| `REVENUECAT_WEBHOOK_SECRET` | iOS entitlement sync | `/api/webhooks/revenuecat` |
| `RESEND_API_KEY` | Invitation / message email | Graceful fail if unset |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics | |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog region | Default `https://us.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Error tracking | Same DSN or split client/server |
| `SENTRY_AUTH_TOKEN` | Source map upload (CI) | Optional locally |
| `NOTION_*` | Beta signup form | Marketing only |
| `OPENAI_API_KEY` | Resume PDF parsing | Onboarding |
| `BRANDFETCH_*` | Company logos | Experience highlights |

See `.env.example` for the full list with comments.

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase keys at minimum

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database migrations

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI against your project or local stack:

```bash
supabase db push
# or for local: supabase start && supabase db reset
```

Migrations are the source of truth for web + iOS shared schema.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Deploy

Deploy to **Vercel**. Set all production env vars in Vercel project settings. Stripe and RevenueCat webhooks should target your production `/api/webhooks/*` routes.
