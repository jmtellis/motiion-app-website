# Project coordination

Booking contracts and booking payments are retired from the website. Global `/bookings`, `/deal-memos`, composer, payout and individual memo URLs display a retirement notice; they cannot create, sign, request payment, or charge. Historical shared backend records and iOS-compatible structures remain intact. Subscription, identity verification and class enrollment billing remain separate and supported.

## Supported workflow

`/projects/:id/coordination` contains two distinct sections:

- **Confirmations**: explicitly move a role's saved final selections into coordination, request dated availability, see the response, place/release a hold, request confirmation, and reschedule or close unconfirmed coordination. These are real, authorized shared backend commands. Moving final selections alone sends no availability request. External applicants require direct contact and are reported accurately.
- **Internal notes**: names, roles, date ranges, status, and private notes from historical `project_bookings`. These never represent a sent request or a talent-confirmed state. Accepted fields exclude fees, currency, payer details, and agreement terms; saving leaves historical financial fields untouched.

The legacy project `/bookings` route redirects to `/coordination`. Composable projects and legacy casting workspaces both expose Coordination navigation. The `bookings` domain table and `project_abilities.booking` database names continue to support legitimate confirmations; they are not booking-payment features.

## Authorization and historical safety

Confirmations use current industry approval plus the trusted `is_project_operator` check before commands; database RPCs independently validate the actor. The internal notes table retains owner RLS. Unauthorized talent updates were denied in staging. Records with a legacy agreement pointer or agreement-stage state are displayed for reference without current coordination mutation actions. Shared historical agreement/payment protections remain in backend resolution commands.

Request idempotency is owned by the existing availability/confirmation RPCs. Rescheduling and closing use a stable UUID per editor session; retries do not duplicate requests. Dates expand to date-only calendar entries without local-time conversion, with a validated IANA time zone. A reschedule cancels obsolete pending requests and requires a new availability response.

## Evidence and rollout

See [projects parity and verification](parity-projects.md), including deployed-versus-prepared migrations. `scripts/project-confirmations.test.ts` covers exact handoff identity, state semantics, date validation and daylight-saving date ranges. `scripts/booking-scope.test.ts` covers obsolete financial-field rejection and legacy links. `scripts/industry-booking-exports.test.ts` still verifies legitimate collection Excel/PDF exports.

Do not deploy historical contract/payment functions from old implementation notes as part of this product scope.
