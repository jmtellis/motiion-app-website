# Industry application review

This change replaces the shared industry access code. Password login, OAuth,
email confirmation, talent onboarding, and community onboarding are unchanged.

## Applicant journey

Selecting Industry Professional opens a short application: known name/email,
professional role, company or Independent, one public professional-work link,
and a brief description of projects they hire dancers for. Personal email is
accepted. The form has pending, needs-information, rejected, and approved states.
Pending applicants can correct details; needs-information/rejected applicants
edit and resubmit the same record. Saving increments its version. Approval opens
the existing professional setup with reviewed details prefilled; returning
approved users retain their normal route into the workspace.

No notification emails are sent by this implementation. Applicants can check
status; iOS also refreshes when the app becomes active. Existing subscription and
identity checks are additional requirements where those features already use them.

## Staff review

Web: `/admin/industry-applications`, linked from the existing admin layout.
iOS: Settings → Profiles to Review → Industry applications.
Both use the existing platform-admin authority. Staff can approve, request more
information, or reject. Feedback is required for the latter two and visible to
the applicant. Each decision records the reviewed application snapshot, version,
reviewer, and timestamp. Review and edit operations serialize per applicant and
reject stale versions. Staff cannot review their own application.

## Authorization

`industry_applications` is readable only by its owner or platform staff. Clients
have no direct insert/update/delete grants. Authenticated submission and staff
review RPCs are the only writes. User metadata, active shell, billing status, and
the old client storage unlock cannot grant approval. The existing staff role is
protected against client self-promotion.

`has_industry_approval` is the shared access check; platform staff retain their
existing administrative exemption. Web checks its hiring layout, casting actions,
professional feature gates, and onboarding completion. iOS checks industry setup,
completion, and the returning industry shell, failing closed on errors.

Database guards cover casting/role/roster writes, casting/composable project
writes, industry completion, new availability and size-sheet requests, and legacy
hiring/job predicates. Project operator checks require approval for industry
projects, while talent event operations keep their existing ownership rules.
Candidate pipeline direct writes require approval through restrictive policies;
trusted talent-submission synchronization remains possible. Paid industry outreach
requires approval; Dancer Pro outreach remains unchanged. Client UI gates are not
the security boundary.

## Rollout — staging deployed, production untouched

The identical migration is in both repositories:
`20261029164725_industry_professional_applications.sql`. Apply it once to the shared
database, not twice. Staging deployment is recorded below; production is unchanged.

**Production existing-account policy still requires a rollout decision.** The migration does not
create approvals, rewrite accounts, or delete data. Its fail-closed default means
existing industry users without an approved application must apply before further
industry activity. If a transition exception is desired, define a reviewed,
bounded allowlist separately before deployment; do not mass mark users approved.
Deploy the database and both clients together to avoid old-client errors. Staff
accounts must already have the platform-admin role managed through trusted tools.

Local web `.env.local` and iOS Demo configuration target the existing
`industry-staging` branch. Regular iOS Debug targets production. Web additionally
has a separate production catalog configuration; disable catalog credentials in
any staging integration-test process. No hosted integration test was performed.
No staging keys, production secrets, or auth-provider settings were changed.

Before hosted rollout, apply to staging with explicit approval and test existing
account routing, staff review, both clients' refresh/return flows, and the latest
full schema's casting/submission triggers. The isolated SQL tests use a minimal
schema and are not a substitute for this full-schema regression pass.

## Local validation

### Historical diagnosis before staging deployment — October 29, 2026

Read-only checks confirmed that `Motiion Demo` uses the Demo build configuration
and `mvkvztpvakybrhyupown`, the healthy persistent `industry-staging` branch.
The first gate request, `POST /rest/v1/rpc/has_industry_approval` with `{}`, returns
HTTP 404 / `PGRST202`. Database catalog checks confirm that both the function and
`industry_applications` table are absent; migration `20261029164725` is absent
from migration history. This is missing deployment, not simply a schema-cache
refresh problem. No user session or hosted writes were used for diagnosis.

The branch currently has four industry profiles, two of which are non-staff.
The migration as written would require those two non-staff profiles to apply;
the two staff profiles retain their administrative exemption. Existing helper
function signatures and required profile columns match the migration's expected
dependencies. This read-only inspection is not a full-schema migration rehearsal.

iOS now explains that applications need environment setup for missing-function
or missing-table errors, while keeping access closed and retaining the normal
retry message for other errors. Four standalone Swift model tests pass, including
missing-schema versus auth/permission/connection error classification; the gate
passes Swift syntax parsing. The earlier full Demo build predates this message-only
follow-up and was not rerun for it.

At diagnosis time the next step was to decide whether existing non-staff industry accounts must apply or
retain access during transition. Then apply the reviewed migration to staging
(with a separately reviewed transition amendment if needed), verify the authenticated
application and staff-review flows, and leave production untouched. No hosted
migration was applied during this diagnosis.

- `supabase/tests/industry-applications/run.sh`: throwaway Postgres, no hosted
  connection or published port; RLS/grants, self-escalation, review versions,
  pending corrections, more-information/rejection resubmission, approved writes,
  legacy hiring, plan independence, talent submission sync/event/request responses.
- `scripts/industry-application.test.ts`: applicant field and URL validation.
- Existing industry-onboarding and environment-isolation tests.
- `IndustryApplicationTests.swift`: standalone model validation and explicit
  approval semantics; iOS Demo simulator build checks integration.

Validated locally: 32 web tests, web type checking and targeted lint, isolated
Postgres authorization tests, and 3 Swift model tests. The iOS Demo simulator
build uses arm64 only. These checks do not exercise hosted auth or a live UI.

## Authorized staging test split — October 29, 2026

Applied only to verified `industry-staging` (`mvkvztpvakybrhyupown`). Hosted
migration `20261029182605`, `industry_professional_applications_staging_test_split`,
contains the shared local migration plus `supabase/staging/industry-access-test-split.sql`
in one atomic application. The hosted timestamp differs from local `20261029164725`;
reconcile that mapping before future CLI pushes rather than rerunning table creation.
The staging-only seed is outside the normal migrations directory.

- Jay Preview (`jay.preview.mv5dthuf@example.com`) retains industry access.
- Avery Quinn (`demo_avery_quinn@example.com`) must submit an application.

Jay's exception is in `industry_legacy_access_grants`, with reason, authorization
reference, timestamp, and database actor. It is revocable via `revoked_at` and
`revocation_reason`. Clients cannot insert, update, or delete grants. No application
or approval was fabricated. The shared migration creates an empty grant table;
it does not automatically grant existing accounts access.

Validation: full migration and seed rehearsed on staging in a transaction and
rolled back, then applied successfully. Read-only checks as each account's
authenticated database role returned true for Jay and false for Avery, with empty
application results. Both staff exemptions passed. All 166 profile rows have the
same before/after checksum; 166 auth users remain. Exactly one grant exists,
with zero applications and reviews. API probes resolve both objects and reject
anonymous access with 42501, replacing the prior PGRST202. Advisor findings for
new objects concern the intentional authenticated SECURITY DEFINER entrypoints;
their authorization and grants were reviewed. Unrelated findings were not changed.

Web type checking and targeted lint passed. Added isolated tests cover grant
recognition, client write denial, and revocation, but this rerun stalled at Docker
startup; those added tests are not reported as passed. No authenticated HTTP
session or end-to-end UI submission was used during deployment verification.

To test: press Try again in Motiion Demo or reopen Industry. Sign in as Jay and
open Industry to confirm retained access; sign in as Avery and open Industry to
see the application. Use existing sign-in credentials, which were not changed.
The database fix needs no rebuild. Rebuild Demo only to include the latest local
missing-schema message change. The web application route now checks the shared
access predicate so grants and staff exemptions also route correctly.

Work links are optional as of `20261029232113_industry_application_optional_work_url.sql` (staging only). Blank links pass both client and RPC validation; supplied links must still be valid HTTP(S) URLs without credentials. The web field is marked optional. Six validator tests and TypeScript checking passed. An authenticated staging transaction verified blank links and rejected malformed links, then rolled back all test writes. Avery’s existing pending version-1 application was preserved; no production changes were made.
