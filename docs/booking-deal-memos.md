# Booking deal memos (MOT-94)

Linear: [MOT-94 Booking deal memo + Connect payment](https://linear.app/motiion-app/issue/MOT-94)

Industry turns a confirmed availability request into a structured `tour_live_dancer` deal memo. Talent reviews it, flags changes, and accepts. Industry then pays one card charge that books the talent. The website and iOS apps share the same migration, Edge Functions and error codes. This repo owns the migration, Edge and web UI.

## Money

| Field | Value |
| --- | --- |
| `talent_deal_cents` | Sum of the talent-facing lines (base fee, rehearsal, per diem, travel, buyout, overtime estimate) |
| `platform_fee_cents` | `round(talent_deal_cents × 1000 / 10000)`: Motiion 10%, charged **on top** |
| PaymentIntent `amount` | `talent_deal_cents + platform_fee_cents` |
| `application_fee_amount` | `platform_fee_cents` |
| `transfer_data.destination` | Talent booking recipient, which receives the **full** `talent_deal_cents` |

The Motiion fee never reduces what the talent receives. The optional agency commission clause is off by default. It is recorded in the memo and paid by the talent to their agency outside Motiion. It is not part of the Motiion fee or the charge. The booking fee is the constant `BOOKING_PLATFORM_FEE_BPS = 1000` in `_shared/booking-deal-memo-template.ts`. It does **not** read `STRIPE_PLATFORM_FEE_BPS`, which stays with class checkout. Accept freezes the money snapshot. `booking-checkout-create` recomputes the fee and refuses with `FEE_MISMATCH` if the stored values drift.

## Flow and states

`draft → offered → negotiating ⇄ (talent / industry turns) → payment_pending → paid`, with the terminal states `declined`, `cancelled` and `expired`.

1. **Industry compose** starts only from an `availability_check_requests` row that the requester owns, with `status = submitted` and `response_kind` either `available` or `available_with_conflict`. Community accounts cannot compose. Each availability request can have only one open memo.
2. **Send** validates required modules and the release/usage gate on the server. Web and iOS show the same `fieldErrors`.
3. **Talent** either flags modules (`remove`, `add` or `dispute` with a structured proposed value) or accepts. Accepting requires a typed-name signature. Talent can also request a call or decline with a reason.
4. **Industry** answers every open flag with `accept_change`, `counter` or `decline` plus a reason. The memo then returns to the talent, who always gives the final Accept.
5. **Accept** moves the memo to Ready for payment (`payment_pending`) for 7 days, freezes the money and legal versions, and records the talent signature.
6. **Pay** is industry only. Industry signs with a typed name on the first Pay. Pay requires the talent's booking recipient to have `stripe_transfers` active. Negotiation and Accept do not require payout setup.
7. **Paid / Booked** is set from Stripe (webhook, or the `sync` action after a redirect).

Negotiation is structured only. There is no free-form contract editor. Exhibit A and EOR are placeholders (`exhibit_a_version` / `eor_version`) pending counsel. There are no Bloc defaults.

## Edge Functions

Every function is `POST` with `Authorization: Bearer <user JWT>` and is deployed with `verify_jwt = false` (auth happens in-function; see `_shared/auth.ts`). Writes use the service role through the atomic RPC `booking_deal_memo_write`. Clients only `SELECT` through RLS.

| Function | Who | Body | Notes |
| --- | --- | --- | --- |
| `booking-deal-memo-create` | Industry | `{ availabilityRequestId \| memoId+expectedVersion, templateKey?, coverNote?, modules: [{ moduleCode, included?, value? }], send?, idempotencyKey? }` | Saves a draft or sends. A replayed `idempotencyKey` returns the same memo. |
| `booking-deal-memo-flag` | Talent (flag); either party (`request_call`) | `{ memoId, expectedVersion, action?: "flag" \| "request_call", flags?: [{ moduleCode, flag, proposedValue?, note? }], note? }` | Talent's turn only |
| `booking-deal-memo-industry-reply` | Industry | `{ memoId, expectedVersion, replies: [{ moduleCode, reply, counterValue?, declineReason?, note? }] }` | Every open flag must be answered |
| `booking-deal-memo-accept` | Talent | `{ memoId, expectedVersion, signatureName }` | Only when no flags are open |
| `booking-deal-memo-decline` | Talent (decline, reason required) / Industry (cancel) | `{ memoId, expectedVersion, reason?, note? }` | Blocked while a payment is processing or has succeeded. Cancels any open PaymentIntent or Checkout Session. |
| `booking-checkout-create` | Industry (`create`); either party (`sync`) | `{ memoId, expectedVersion?, action?: "create" \| "sync", mode?: "payment_intent" \| "checkout", signatureName?, returnPath? }` | Adds `checkout: { mode, status, clientSecret?, url?, paymentIntentId? }` |
| `connect-account-v2-create` | Talent | `{ returnPath? }` | Creates or reuses the recipient. Returns `{ payout, url }`. |
| `connect-account-v2-onboarding` | Talent | `{ action: "status" \| "onboarding_link" \| "update_link" \| "dashboard_link", returnPath? }` | `status` re-syncs from Stripe |

Memo responses share one shape: `{ memo, provisions, events, viewer, chip, expired, openFlags, dealLines, fees: { talentDealCents, platformFeeBps, platformFeeCents, chargeAmountCents, talentReceivesCents, currency }, payoutReady }`. The `memo` object omits `idempotency_key`, `stripe_destination_account_id` and `stripe_charge_id`.

Errors are returned as `{ error, errorCode, fieldErrors?, memoId? }`:

| HTTP | `errorCode` |
| --- | --- |
| 400 | `INVALID_MODULE_VALUE`, `INVALID_FLAG`, `INVALID_REPLY`, `SIGNATURE_REQUIRED` |
| 403 | `COMMUNITY_NOT_ALLOWED`, `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `AVAILABILITY_NOT_ELIGIBLE`, `MEMO_EXISTS` (with `memoId`), `NOT_YOUR_TURN`, `MEMO_NOT_READY`, `MEMO_EXPIRED`, `MEMO_CONFLICT` (stale `expectedVersion`; reload), `CONNECT_ONBOARDING_REQUIRED`, `ALREADY_PAID`, `FEE_MISMATCH` |
| 422 | `TEMPLATE_UNSUPPORTED` (any template other than `tour_live_dancer`), `REQUIRED_MODULES_MISSING`, `RELEASE_NOT_APPROVED` |

Notifications are rows in `notifications` with `type = booking_deal_memo` and `data = { memo_id, action, actor_id, recipient_role }`. The web routes `recipient_role = talent` to `/deal-memos/{id}` and `industry` to `/bookings/deal-memos/{id}`.

## Connect compatibility

| | Booking payouts (MOT-94) | Class instructor payouts (existing) |
| --- | --- | --- |
| API | Accounts **v2** (raw fetch, `Stripe-Version: STRIPE_ACCOUNTS_V2_API_VERSION`) | Accounts v1 (`npm:stripe`, pinned `2024-06-20`) |
| Configuration | `recipient` with `stripe_transfers`, Express dashboard, fees and losses collected by the application | Express with `card_payments` + `transfers` |
| Charge type | Destination charge, card only | Existing class checkout (unchanged) |
| Storage | `booking_payout_accounts` | `profiles.stripe_connect_account_id` |
| Identity | Not used | `profiles.identity_verification_*` (unchanged) |

The booking code never reads or writes `profiles.stripe_connect_account_id`. `account.updated` only syncs accounts found in `booking_payout_accounts`. Every other account falls through to the existing class handler.

## Deploy checklist (Jay / CoS)

**Do not apply the migration from this PR's agent.** Jay or CoS applies `supabase/migrations/20260929120000_booking_deal_memos.sql` to prod (`pygdxcscmebeqjxhzzuq`). The web deploy is safe before the migration: the Bookings desk hides its deal memo section when the tables are missing, and the talent Home banner shows nothing.

1. Apply the migration. It is idempotent: `create … if not exists`, `create or replace` for functions, and drop-then-create for policies and triggers.
2. Schedule expiry with pg_cron, hourly:

   ```sql
   select cron.schedule('booking-deal-memos-expire', '0 * * * *', $$select public.booking_deal_memos_expire_stale()$$);
   ```

3. Set Edge secrets:
   - `STRIPE_ACCOUNTS_V2_API_VERSION` (optional, default `2026-08-26.dahlia`). This must be a version that supports Accounts v2 recipients.
   - `STRIPE_CONNECT_WEBHOOK_SECRET`: signing secret of the Connect endpoint (below).
   - `STRIPE_THIN_WEBHOOK_SECRET`: signing secret of the v2 event destination (below).
   - The existing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL` are reused.
4. Deploy the functions with `--no-verify-jwt`: `booking-deal-memo-create`, `booking-deal-memo-flag`, `booking-deal-memo-industry-reply`, `booking-deal-memo-accept`, `booking-deal-memo-decline`, `booking-checkout-create`, `connect-account-v2-create`, `connect-account-v2-onboarding`, and the updated `stripe-webhook`.
5. Point these Stripe endpoints at the one `stripe-webhook` URL:
   - **Platform** (existing, `STRIPE_WEBHOOK_SECRET`). Add `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
   - **Connect** (`STRIPE_CONNECT_WEBHOOK_SECRET`): `account.updated`.
   - **Event destination, thin v2** (`STRIPE_THIN_WEBHOOK_SECRET`): `v2.core.account[requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated`, `v2.core.account.updated`.
6. The website needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for the Payment Element. It is already used by class checkout.
7. Tell the iOS agent/repo which versions shipped. Error codes and payload shapes are shared.

The website `/api/stripe/webhook` still handles only subscriptions and identity, and owns `stripe_webhook_events`. Booking idempotency uses `booking_deal_memo_events.stripe_event_id`.

## Refunds and disputes

A full refund of a paid memo moves it to `cancelled` and records `amount_refunded_cents`. Partial refunds keep it `paid` with `payment_state = partially_refunded`. Refunds issued from the Dashboard do **not** reverse the transfer to the talent automatically; issue the refund with `reverse_transfer` and `refund_application_fee` as appropriate. Disputes are recorded (`payment_state = disputed`). Resolving them is an ops process.

## Web routes

| Route | Shell | Purpose |
| --- | --- | --- |
| `/bookings` | Industry | Ready to book (confirmed availability) and the deal memo list |
| `/bookings/deal-memos/new?availability=<id>` | Industry | Compose (redirects to the open memo if one exists) |
| `/bookings/deal-memos/<id>` | Industry | Draft composer, or the negotiation / pay workspace |
| `/deal-memos` | Talent | Offers and booking payout status |
| `/deal-memos/<id>` | Talent | Review, flag, accept, decline |
| `/deal-memos/payouts` | Talent | Stripe onboarding return/refresh and status |

## Tests

```bash
npm run test:booking-deal-memo       # template, money, send gate, negotiation, chips, notification routing
npm run test:booking-deal-memo-sql   # applies the migration twice to a throwaway local Postgres and checks
                                     # transitions, locks, RLS, guards, refunds, expiry and cascades
                                     # (run as a role that can create databases, e.g. `sudo -u postgres`)
```

## Out of scope

ACH, deposit/balance split, batch pay, other templates, a free-form editor, Bloc paste, an Identity fee, and a class checkout rewrite.
