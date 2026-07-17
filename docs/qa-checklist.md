# QA checklist — Motiion MVP magic moments

## Talent magic moment

- [ ] Sign up as talent → lands on `/onboarding`
- [ ] Complete onboarding (headshots, attributes, publish) → redirects to `/home`
- [ ] Home shows **Matched for you** with at least one opportunity (run `scripts/seed-opportunities.ts` if empty)
- [ ] `onboarding_completed` event in `analytics_events`

## Industry magic moment

- [ ] Sign up as industry → `/talent-buyers/onboarding` → `/projects`
- [ ] Talent Navigator NL chat refines grid with reasoning exposed
- [ ] Talent Navigator search returns verified talent in < 1.5s
- [ ] Save talent to roster → persists in `/library`
- [ ] Add talent to project roster from navigator
- [ ] Save search → restores filter state on re-run
- [ ] `talent_saved_to_list` event logged

## Industry OS loop

- [ ] Create project + casting (composer saves)
- [ ] Review submission on project talent board (shortlist / callback / decline)
- [ ] Create client presentation link → `/shortlist/[token]` review works
- [ ] Approved talent appears on project roster
- [ ] Bulk invite roster to casting
- [ ] Invite talent from roster → `invitations` row created
- [ ] Project-linked activity appears on project detail
- [ ] Open messages from project with context filter
- [ ] Contact from navigator deep-links to conversation thread

## Payments (test mode)

- [ ] Unpaid industry user hits paywall on gated action
- [ ] Stripe Checkout completes → `subscriptions` row active
- [ ] Billing portal link from settings works

## Production smoke

- [ ] `npm run build` passes
- [ ] Vercel preview deploy loads marketing + auth
- [ ] Stripe + RevenueCat webhooks return 200
- [ ] Sentry receives test error with PII scrubbed

## Casting website ↔ iOS E2E parity (manual)

**Setup:** Bridge migration `20260712150000_web_casting_mobile_bridge.sql` applied; buyer web account + Pro talent iOS account; talent profile verified with overlapping role skills; push prefs enabled (`notify_casting_match`, `notify_jobs`).

| # | Flow | Buyer (web) | Talent (iOS) expected | DB checks |
|---|------|-------------|----------------------|-----------|
| T1 | Publish + open match | Composer → publish public casting with matching skills | Card in Review Castings deck; optional `casting_match` push | `roles.is_active=true`, `composer_draft=false`, `special_skills` populated |
| T2 | Profile filter mismatch | Role with narrow gender/age outside talent profile | Card hidden or mismatch confirmation on submit | `roles.client_match_filters` snapshot present |
| T3 | Web invite | Outreach → invite talent to role | `casting_update` push; inbox Requests card | `invitations` row + `role_access` pending via bridge |
| T4 | Invite-only submit | `submitter_policy_raw: invited_only` + invite one talent | Invited can submit; others blocked `invite_only` | `create_casting_submission` guard |
| T5 | Native submit | Public casting; talent submits with note | Status Submitted; appears in web Review with name/headshot | `submissions` row `talent_id`, `status=pending` |
| T6 | Review sync | Shortlist candidate on web | Hirer iOS view reflects status if same poster | `casting_candidates` + `submissions` aligned |
| T7 | Finalize outcomes | Select winners → Finalize role on web Cast panel | All submitters get `casting_submission_outcome` push | `roles.is_casting_finalized=true`, `final_select_ids` = submission UUIDs |
| T8 | Post-finalize submit block | Talent submits after finalize | Error `role_finalized` | `create_casting_submission` returns `role_finalized` |
| T9 | Breakdown parity | Edit all wizard fields | iOS casting detail matches location, deadline, materials, visibility | `projects.casting_configuration` keys match |

**Parity spot-check (web Breakdown vs iOS detail):**

- [ ] `submission_deadline_iso8601`, `submission_limit`, `submission_method_raw`
- [ ] `visibility_presentation_raw`, `submitter_policy_raw`
- [ ] `location_mode_raw`, city/region, travel policy
- [ ] `compensation_category_raw`, rate presentation
- [ ] Per-role: title, people needed, age/gender, skills, union, agency required

**Automated Revyl coverage (staging):**

- [ ] `notifications-web-casting-invite-inbox` — seeds `invitations` row (no `role_access`) and verifies Requests inbox
- [ ] `notifications-casting-finalize-outcome-trigger` — finalizes role via API seed and verifies `casting_submission_outcome` notification
