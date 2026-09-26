# Industry bookings rollout

Implemented in the website:
- White industry workspace canvas with a dark resizable sidebar.
- Owner-authorized Excel and PDF roster exports from the active collection screen.
- Bookings navigation hub and project-level Bookings tab.
- Internal booking stages: draft, negotiating, confirmed, work completed, cancelled.
- Fee, currency, work dates, billing contact, negotiation notes and editable job outlines.
- Draft text download. No document is represented as signed or sent.

## Activation
The Supabase CLI is connected. Migration `20260925000000_project_bookings.sql` was applied to the app’s linked database on September 25, 2026 using an isolated copy of its remote migration history. The dry run listed only this migration; no unrelated local migrations were pushed. The booking table is available through the API.

Row-level security restricts bookings to the owner of the associated project. Server actions also require a hiring account and check project ownership. Cross-owner access and create/update should be verified after applying the migration.

## Remaining end-to-end work
The current booking tracker is internal coordination, not a completed transaction system. It does not send offers, obtain signatures, collect money, or transfer funds.

1. Talent identity: link bookings to a professional profile or invited external recipient, with invitation acceptance and agency representation.
2. Negotiation: versioned offers, recipient access, accept/counter/decline, immutable offer history, explicit notifications and messaging integration.
3. Contracts: legally reviewed templates per job type and jurisdiction, version locking, signing-provider integration, webhook verification and signed-file storage. Current outlines are job-detail prompts only.
4. Payment model decision: direct charges per dancer versus one project charge with separate transfers. The latter supports a single payer covering multiple dancers but makes platform fee/refund/dispute handling part of Motiion's operations.
5. Stripe Connect recipient onboarding and verified capabilities before transfers. Keep subscription billing separate from job payments.
6. Payer requests: authenticated, expiring request links; server-priced immutable line items; allow an external billing contact to pay without granting project access.
7. Payment ledger: request, pending, funded, allocated, transferred, failed, reversed and refunded states. Track each recipient independently; never mark every dancer paid from the project charge alone. Distinguish transfers from bank payouts.
8. Durable idempotent checkout/transfer operations, signed webhook ingestion, retries, reconciliation, partial failures and refund/transfer reversals.
9. Define supported countries, currencies, fees, cancellation terms, tax reporting and whether payroll is required for the engagement before launch.

References: https://docs.stripe.com/connect/direct-charges and https://docs.stripe.com/connect/separate-charges-and-transfers

## Checks
Focused lint passed. Export checks cover Excel round-trip, formula-like names stored as text, accented names, multi-page PDF generation and booking schema validation (negative fees, unsupported paid status, date order, email format). Run `npx tsx scripts/industry-booking-exports.test.ts` from the website root. The existing full TypeScript check reports unrelated errors in older scripts; no new source errors were found.
