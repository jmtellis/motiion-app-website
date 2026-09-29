# Composable projects (MOT-93)

Industry projects are a generic **shell** (name, optional cover/city/dates) that
gains **abilities** — Casting, Roster, Classes — after create. Web and iOS share
the same Supabase rows; this doc is the storage contract.

**No migration.** Everything lives in existing `projects` columns.

## `projects` row

| Column | Composable value |
| --- | --- |
| `title` | Project name (required). Owned by the shell — casting saves never overwrite it. |
| `location`, `start_date`, `end_date`, `cover_image_url` | Optional shell fields. Casting may fill them only while empty. |
| `project_type` | Stays `production` (column default). Soft label only; never drives routing. |
| `visibility` | `private` at create. Only flips when the Casting ability publishes (talent casting detail still reads the project row). |
| `is_active` | `true`. Shell is never a draft; archive uses `composable.archived_at`. |
| `enabled_modules` | One boolean per ability: `{ "casting", "roster", "classes" }`, next to the legacy `activities` flag. |
| `project_configuration.composable` | Marker + UI state (below). Presence with `version >= 1` = composable. |
| `casting_configuration` | `{ schema_version: 7, composer_draft: true }` until a casting publishes. |

```json
{
  "composable": {
    "version": 1,
    "paused": ["classes"],
    "prompt_dismissed_at": "2026-09-29T17:00:00Z",
    "archived_at": null,
    "created_via": "web_thin_create"
  }
}
```

- `paused` — enabled abilities the owner paused. Data stays; the ability is
  dimmed and skipped by the smart primary CTA.
- `prompt_dismissed_at` — "What do you need?" was dismissed. A zero-ability
  project shows a soft banner again 24h after create.
- `archived_at` — hides the project from the active hub list.

## Abilities → existing tables

| Ability | Where the work lives | Publishes |
| --- | --- | --- |
| Casting | Child `castings` row (created as draft when enabled) + `roles`. Web reuses the casting workspace (`/projects/:id/workspace/*`) for composable projects with Casting on. | `castings.status/visibility` (open call) |
| Roster | `talent_lists` (`kind = project_roster`, `project_id`) + `talent_list_members`. Talent Card data from `professional_profiles` + `talent_credits`. | Invite-only |
| Classes | `activities` (`type = class`, `project_id`) — one row per dated session; capacity/waitlist/tiers/check-ins use existing activity columns and `enrollments` / `activity_check_ins` / `activity_ticket_options`. | `activities.is_private = false` (listed) |

Legacy (type-first) projects are untouched. The hub derives their ability icons
from attached castings/roles, roster members, and class sessions.

## Web routes

- `/projects?create=1` — thin create sheet (name required; city/dates optional).
  `&intent=casting` pre-selects Casting on the new project's home.
- `/projects?create=activity` — standalone event / class / session / job picker.
- `/projects/:id/overview` — project home for composable projects.
- `/projects/:id/workspace/breakdown` — Casting ability (existing casting stages).
- `/projects/:id/roster` — full roster page (`?invite=1` opens invite).
- `/projects/:id/classes` — class series + sessions.
