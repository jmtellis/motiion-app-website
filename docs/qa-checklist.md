# QA checklist — Motiion MVP magic moments

## Talent magic moment

- [ ] Sign up as talent → lands on `/onboarding`
- [ ] Complete onboarding (headshots, attributes, publish) → redirects to `/home`
- [ ] Home shows **Matched for you** with at least one opportunity (run `scripts/seed-opportunities.ts` if empty)
- [ ] `onboarding_completed` event in `analytics_events`

## Industry magic moment

- [ ] Sign up as industry → `/talent-buyers/onboarding` → `/dashboard`
- [ ] Talent Navigator search returns verified talent in < 1.5s
- [ ] Save talent to roster → persists in `/library`
- [ ] Save search → restores filter state on re-run
- [ ] `talent_saved_to_list` event logged

## Closed loop

- [ ] Create project + casting (composer saves)
- [ ] Invite talent from roster → `invitations` row created
- [ ] Talent sees invitation on home / responds accept or decline
- [ ] Project status reflects invitee response
- [ ] Send message in project thread → both participants see it
- [ ] Notification badge updates for invitation / message

## Payments (test mode)

- [ ] Unpaid industry user hits paywall on gated action
- [ ] Stripe Checkout completes → `subscriptions` row active
- [ ] Billing portal link from settings works

## Production smoke

- [ ] `npm run build` passes
- [ ] Vercel preview deploy loads marketing + auth
- [ ] Stripe + RevenueCat webhooks return 200
- [ ] Sentry receives test error with PII scrubbed
