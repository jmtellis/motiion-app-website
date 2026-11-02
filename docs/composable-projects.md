# Shared project contract

Current iOS project behavior is authoritative. Projects use `projects.is_composable`, the `project_abilities` table, and trusted commands. Older website documentation described JSON fields as the shared contract; that assumption was stale. The web now reads canonical fields and writes through the current commands.

## Current storage and commands

| Purpose | Current shared contract |
| --- | --- |
| Create private project | `create_project_shell(p_title,p_location,p_start_date,p_end_date,p_request_id)` returns its UUID. Reuse the same request ID after an interrupted attempt. |
| Name, city and dates | `update_project_shell`. `projects.title/location/start_date/end_date`; dates are calendar dates. |
| Project identity | `projects.is_composable = true`. Generic `project_type` is not the workspace's source of truth. |
| Active or archived container | `projects.is_active`; active composable containers may contain a draft casting. |
| Enabled tools | `project_abilities(project_id,ability,settings)`; `enable_project_abilities`, `disable_project_ability`. Disabling retains underlying data. |
| Notes | `project_abilities.ability = notes`, `settings.body`; `update_project_ability_settings`. |
| Industry project list | iOS `list_my_projects` returns authorized owner/member summaries. Web uses owner plus explicit project membership and RLS-scoped detail reads. |
| Casting | Child `castings`, `casting_roles`, bridged `roles`, submissions/candidates. Publication uses existing casting commands and current approval/identity gates. |
| Roster | `talent_lists(kind=project_roster,project_id)` and members. Enabling roster creates the canonical collection. |
| Classes | Project-linked `activities` and enrollments. Class billing is distinct from removed booking payments. |
| Confirmations | Shared `bookings` domain and `project_abilities.booking` database names survive for selection, availability, holds and confirmation. Contract/payment UI does not. |

`src/lib/talent-buyers/project-contract.ts` adapts canonical fields to the existing web presentation model without changing database records. Canonical abilities take precedence over stale `enabled_modules`. Older web projects with `project_configuration.composable` continue to open; enabling a tool also marks the record canonical and calls the shared ability command. There is no automatic bulk production rewrite.

The JSON `project_configuration.composable` remains **web presentation metadata** for prompt dismissal and explicit pause state. Pausing calls the canonical disable command and keeps the paused control accessible on web; re-enabling from either app clears the effective pause. Archiving updates canonical `is_active` as well as the web timestamp. Unknown JSON fields and attachments are retained.

## Website behavior

The hub is one card grid: Active (default), Drafts, Archived. Legacy Browse/Focus/list/view/layout/All Work preferences normalize safely. An active project container is listed in Active; its casting can still show Draft. Old event containers are hidden only when an actual hosted activity is available; legacy job containers remain reachable.

The create dialog stores an account-scoped session draft and request ID. Closing and reopening, refresh and a failed request retain the entered values; successful creation clears them. New accounts cannot inherit another account's draft. The shared RPC provides retry identity. Notes live on project home with a guarded editor and real shared persistence.

Coordination is accessible from legacy and composable projects. Finalizing selections and moving them into Confirmations are deliberately separate actions. The additive `20261102155048_atomic_casting_finalization.sql` command closes a role and updates People atomically. The existing `move_casting_final_selects_to_confirmations` command moves its exact saved selections; then the owner requests availability or confirmation.

See [projects parity and deployment ledger](parity-projects.md) for actual automated, database and browser evidence. The new atomic finalization RPC requires reviewed production deployment. Existing current iOS migrations were applied only to staging where missing; they must not be duplicated in production.
