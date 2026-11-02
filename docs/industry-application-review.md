# Industry application review

Current website behavior (2026-11-02) follows the iOS identity and approval flow. The historical “production untouched” and “no notification emails” rollout notes are superseded; consult `docs/parity-auth.md` for current verified environment state and remaining delivery checks.

## Applicant journey

Industry signup preserves its role through email confirmation. The application has five short steps: About you (photo, name, username, adult birthday), Your work (role, company or Independent, contact email, optional website), Projects, How you heard about Motiion, and Review. Personal email is accepted. Bare-domain websites are normalized to HTTPS. Uploaded photos and entered details are saved in account-scoped, application-version-scoped browser drafts; successful submission stores identity and application atomically.

Pending applicants can correct details. Needs-information and rejected applicants see staff feedback and resubmit the same record with an incremented version. Return visits refresh status. Stale review/submission operations are rejected by the database. Approval opens a concise introduction then `complete_industry_approved_setup`, which reuses reviewed details and preserves identity instead of repeating the old professional questionnaire. Staff/legacy grants without an approved application retain their previous setup path.

## Staff operation and authorization

`/admin/industry-applications` requires the trusted platform-admin RPC. The queue displays submitted work details and current profile photo, username, private birthday, and acquisition source. Approval, request-information, and rejection use versioned `review_industry_application`. Feedback is required for request-information/rejection; staff cannot review themselves.

Clients cannot directly write application/review rows. Submission, review, and setup go through authenticated RPCs. `has_industry_approval` remains the shared server/database access predicate, separate from verified email, subscription entitlement, and identity verification. No existing production account access policy was changed in the parity work.

## Shared migrations and environment

The shared production schema already contains the identity submission and approved-setup RPCs. Staging was missing the identity wrapper; the exact iOS migration `20261031235020_industry_application_identity.sql` was applied once as `industry_application_identity`. The source remains in the iOS repository, not duplicated in web. Reconcile the hosted timestamp before CLI pushes.

## Notifications

The product shows review status and feedback in-app. Shared `industry-approval-dispatch` handles approval and request-information emails through Resend where configured. Supabase Auth owns signup confirmation and password-recovery email. Presence of code, schema, or an environment variable does not establish successful delivery. Production SMTP/template settings were inspected read-only; existing production approval deliveries were verified by the main integration pass. A real designated staging confirmation email was delivered and its linked action completed. No historical reviews were backfilled by this work.

## Verified

Actual fictional staging-account journey: upload → application → needs information → resubmit → rejection → resubmit → staff approval → atomic setup. Staff could read/review; another talent could not read the application; applicant review was denied; stale version was denied. Current iOS rollback-only identity regression also passed. See `docs/parity-auth.md` for tests and precise limits; browser checks additionally exercised the complete five-step application, pending state, actual staff approval, approved introduction and dashboard. See the separate delivery evidence in that document.
