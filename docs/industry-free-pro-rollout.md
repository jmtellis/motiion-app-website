# Industry Free / Pro rollout

Production backend deployed November 1, 2026: migration `20261101182153` and `openai-chat` version 9 on `pygdxcscmebeqjxhzzuq`. Website release is in progress. No App Store or TestFlight binary has been distributed. Existing configured prices and Talent offers are unchanged. Industry entitlement uses the existing authoritative `effective_choreographer_plan_tier`; Dual Pro continues to grant Industry access.

## Rules

| Feature | Free | Industry Pro / Dual Pro |
| --- | --- | --- |
| New casting publishing | One successful publish in a rolling 30 days; one accepting applications | Unlimited plan-based publishes/open castings |
| Saved Talent | Unlimited | Unlimited |
| Owned custom rosters | 3; unlimited members | Unlimited; unlimited members |
| Roster sharing | Existing links retain expiry/revocation | New shares, extensions and expiring links |
| Client shortlist review | One project, once; all roles and entire review cycle | Additional projects |
| Whole-cast schedule, individual messages, main project conversation | Included | Included |
| Project groups, group schedules, contextual chats | Existing data/chats stay available | Create/manage advanced workflows |
| Industry voice search | Hidden; recording, parsing and execution gated | Visible and enabled |

Previewing a shortlist does not claim its trial. Creating a live share link does. Link expiry is separate from the permanent project scope of the trial. Client feedback and invited participants' existing access/replies remain permission-based, not subscription-based.

## Authoritative enforcement

`20261101182153_industry_free_pro_entitlements.sql` is mirrored in both repositories for the same database. Apply it **once**, through the repository used to manage this environment's migration history. It requires the existing project, role, child-casting, roster/public-link, shortlist-review, participation, group-chat, and featured-workspace migrations.

Private, RLS-enabled history tables have no client grants. Publication/trial history has no content foreign key, so deleting projects/shares cannot restore usage. History remains account-scoped through reinstall. Actual account deletion still cascades account data. Advisory transaction locks serialize account quota/trial decisions; failed SQL transactions roll back consumption. Deleted published IDs cannot be reused, even as drafts. Preview RPCs never reserve allowances.

Publishing is staged: iOS saves an inactive composer draft and all roles before activation. Website child-casting setup stays draft until `publish_industry_child_casting` atomically activates child, roles, and parent. Failed setup retains/rolls back draft content without consuming a publication. Both write surfaces share the account history. Edits do not count as new publishes; new child castings do. Reopening checks the open-casting cap and other recent publications. Closing applications does not finalize roles or remove review, shortlist, confirmations, messages, or project data.

Roster quotas count owned `roster` rows, including custom rosters linked to a project. Received shares and genuine `project_roster` cast lists are excluded. Saved Talent is a single canonical list with unlimited members. Existing excess rosters remain readable/editable; no new roster at 3 or more. Deleting a custom roster frees its slot.

Group entitlement follows the project owner; existing authorization checks remain in place. Whole-project conversation is one reusable free channel with membership synchronized to project access. Existing contextual conversations remain accessible after downgrade, and existing groups can lazily open their chat without requiring participants to upgrade. Existing group schedule date/time/location corrections are allowed; new audience assignments require Pro. Existing trusted featured-workspace triggers can provision their built-in public-lineup group, and accepted lineup members can still join after downgrade. This is not an entitlement to create custom groups.

## Migration defaults

- Existing non-draft published castings, including inactive/closed castings with roles and web child castings, start their rolling window at migration time. Original publication timestamps are not reliably recorded. This conservative default may delay a free user's next new publish by 30 days. Existing live castings can continue; new/reopened castings must satisfy the limits.
- Every project with an existing shortlist share is grandfathered for the full review cycle. These owners have used their free trial. All prior shared projects, including ones started on Pro, remain usable after downgrade. Legacy standalone roles use their role ID as the durable review scope.
- Content deleted before this migration has no recoverable publication/share history in these tables and cannot be reconstructed. History is durable for all subsequent actions.
- Existing roster links keep their expiration. Revocation and expiry shortening remain permitted; new/extended links require Pro.
- No existing rosters, reviews, votes, schedules or conversations are deleted or hidden by the migration.

## Release order

1. Back up and apply the migration to staging. Run the database tests and smoke-test with actual free, Industry Pro, Dual Pro, downgraded organizer, and invited participant accounts. Verify the existing entitlement function maps those paid products correctly.
2. Deploy the iOS repository's `openai-chat` Edge Function. It adds the Industry voice purpose and service-only entitlement check. No new API secrets or product prices are required.
3. Deploy the website changes and release the iOS client. The updated clients depend on the new RPCs; release the backend first.
4. Run post-deployment Supabase security/performance advisors and the same account-flow smoke tests before promoting to production.

## Validation

- `bash Supabase/tests/industry-entitlements/run.sh`: disposable PostgreSQL 17 tests, never writes a connected Supabase project. Uses production-shaped minimal schema fixtures, not a full historical migration replay. Covers quota boundary, rollback/deletion/ID reuse, roster exclusions, review scope, downgrade, voice access, shared web publishing, private table permissions, free main chat membership, and concurrent publish/trial requests.
- iOS: simulator build, targeted `MotiionPlanLimitsTests`, Industry/Dual and Talent comparison tests in `PortfolioListsPreviewBuilderTests`, and `VoiceQueryParserTests`.
- Website: TypeScript source/full checks and focused lint. Stale generated Next development route validation can be regenerated/removed without changing application source.

The linked project's relevant schema and roster indexes/types were inspected read-only to confirm compatibility. Production database RPC presence and unauthenticated denial were verified. The eight legacy shortlist shares whose owners no longer exist are excluded from account-history backfill; their content is preserved.
