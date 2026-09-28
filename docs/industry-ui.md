# Industry workspace UI

The industry app uses a dark navigation rail and an inset white workspace, inspired by the supplied Shopify admin references. Marketing and talent-facing product surfaces retain their existing themes.

## Shared foundations

`industry-light.css` scopes the palette to `.workspace-shell--industry .workspace-frame` and the industry dialogs rendered outside the frame. Feature styles consume `--industry-*` tokens with their original dark values as fallbacks. Do not add white opacity text or black canvas gradients to industry features.

- Text: `--industry-text` (#202223); secondary text: `--industry-muted` (#595f62).
- Surfaces: `--industry-surface` (white), `--industry-fill` (#f1f2f3).
- Card dividers: `--industry-line` (#d5d8da). Input outlines: #858b8f.
- Focus and links: #006b80. Status text has separate success, warning, and danger tokens.
- Cards: 18px corners, thin border, soft shadow. Controls: 10px field corners and pill actions.
- Primary actions use charcoal with white text. Secondary actions use white with a visible border.
- Photo overlays keep white text on a dark image gradient; do not apply canvas text colors to them.

## Reusable components

Import `IndustryCard`, `IndustryField`, `IndustryInput`, and `IndustryBadge` from `components/talent-buyers/dashboard/IndustryUI`. Settings uses the field and card primitives; project cards use the status badge. Existing `SegmentedControl`, `Modal`, `.bd-btn-secondary`, `.bd-btn-accent`, and `BuyerChromeBar` share the same foundations.

```tsx
<IndustryCard>
  <IndustryField label="Project name" hint="Visible to your team.">
    <IndustryInput name="name" required />
  </IndustryField>
  <IndustryBadge tone="success">Confirmed</IndustryBadge>
</IndustryCard>
```

Use visible labels, retain native input semantics, and provide a focus-visible outline. Disabled fields have a gray surface rather than reduced text opacity. Status labels must communicate their meaning in words as well as color.

## Staging portrait

`public/images/staging/fictional-talent.png` is an AI-generated fictional adult headshot, created for this staging exercise. It was uploaded to the staging Supabase headshots bucket and attached only to the existing Test Talent profile. No production profiles or photos were changed. Do not present the portrait as a real person's identity or credits.

## Industry workflow redesign

The workspace keeps the dark navigation shell, white inset panel, and Talent
Navigator dancer grid. The studio redesign uses a soft neutral gray canvas, elevated white content
surfaces, charcoal actions, and restrained separators. Color is reserved for
photography and meaningful states.

- `IndustryPageHeader`: page purpose and primary action at the top right; actions
  wrap beneath the title on small screens.
- `IndustryEmptyState` and `IndustryJourney`: actionable starting points and short
  workflow explanations. Skeletons are reserved for actual loading.
- Projects: searchable work list by default, Cards and Focus alternatives, status
  filters, real summary counts, and contextual previews. Opening a preview does
  not navigate away or mutate the project.
- `Modal placement="drawer"`: reusable contextual detail panel with Escape,
  keyboard focus containment, focus restoration, and reduced-motion support.
- Settings: accessible section tabs that retain mounted forms and unsaved edits;
  account edits reveal explicit Save and Discard controls.
- Quick navigation: sidebar entry and Command/Ctrl K, keyboard-searchable pages
  and existing creation actions. This is navigation, not an AI assistant.
- Notifications: explicit mark-shown-as-read action, unread filter, error feedback,
  and realtime updates; simply opening the page does not mark notifications read.
- Calendar: real empty calendar grid plus Today, previous/next, and range controls.
- Project overview: local shortcuts to team, bookings, and files.

These changes are frontend workflow changes. Existing creation, casting, booking,
and payment operations retain their authorization and staging isolation.

## Populated studio design

`industry-studio.css` is the final scoped layer. The Talent Navigator retains its
existing grid and canvas. Other industry pages use gray space to separate white
content surfaces; do not wrap every block in an outlined card. Use compact
controls, subtle shadows, and a single strong focal point per page.

`WorkSpotlight` chooses actual active work with applications and shows real role
and application counts. It puts drafts alongside the feature and a searchable,
type-filtered list below. Bookings queries only projects owned by the signed-in
industry profile and summarizes real booking states.

To refresh fictional demo data, run `node scripts/seed-industry-demo.mjs` with the
existing staging `.env.local`. The script rejects any other Supabase URL and
verifies the fictional owner email before writing. Deterministic IDs make repeat
runs idempotent. It creates eight fictional talent personas with stock portraits,
projects and drafts within the published-casting limit, applications, rosters,
bookings, activities and attendance, synthetic conversations, and sample files.
It never changes subscriptions. Portraits represent demo personas, not real
identity claims. `.staging/demo-manifest.json` stays private and ignored.

## Hierarchy and spacing

Use 30px page titles (28px on phones), 18–20px section headings, 14px
working text, and 12px supporting metadata. Status labels may be compact but
must remain readable. Controls are at least 40px high, with primary mobile
actions at least 44px. Use 24px between sections, 16–24px inside surfaces,
and 8–12px between related controls. Keep settings content to a readable form
width; let tables, calendars, and talent grids use the available workspace.
Casting review keeps role and view controls in one toolbar. The Talent Navigator
keeps its existing image-led composition. Responsive grids must size cards from
available content width rather than assuming the sidebar has a fixed width.

## Talent workspace alignment

The light surface and studio styles now scope to both signed-in workspace shells.
Talent keeps its own routes and permissions. Its shell uses the shared wordmark,
sidebar resize behavior, Lucide icon sizing, and an upward-opening account menu.
Mobile retains bottom navigation and a header account control.

`TalentDiscovery` shares `TalentNavigatorGrid`, row construction, and the slide
coordinator with the industry Navigator. Search uses the existing authenticated
talent search route and Browse exposes its existing filters. It does not call
industry save, invite, casting, or subscription actions. Settings remains in the
workspace and links to the real portfolio/profile setup workflows.

### Shared shell and talent materials

- Both workspaces use `WorkspaceSidebarHeader` for the wordmark and collapse control geometry.
- `workspace-controls.css` owns pill radii and shared primary/secondary actions. Media cards and dialogs remain rounded surfaces.
- Projects leads industry navigation. Talent Account contains Notifications and Settings; the account trigger opens the shared dialog primitive. Talent desktop pages have no shell toolbar.
- Talent Home reads active `featured_carousel_items`, matching the app's curated source. Empty staging collections fall back to three clearly labeled talent categories, not invented featured rosters. Event rails only query active public events, with pinned Meet the Cast events first and sponsored events separate.
- Portfolio materials follow the app order: Profile, Headshots, Highlights, Visuals, Resume, Size Sheet. Setup links select the relevant step. Highlights and video links save to the signed-in user's profile and preserve metadata on retained entries.
- Local preview only; no deployment performed.

### Local development performance

`npm run dev` uses Webpack on port 3001. The Turbopack development process on this machine repeatedly grew to a 13.5 GB footprint and sustained more than three CPU cores while signed-in navigation took 35–80 seconds. Sampling located the busy work in `next-swc` native compiler callbacks. With Webpack, two passes through Home, Portfolio, Schedule, and Inbox returned 200; warm full-response times were 0.51–1.36 seconds and the process returned to idle. Production build configuration is unchanged. Refresh open tabs after switching compilers to replace the previous development runtime.

### Talent signup polish

Profile creation and deferred setup now use a centered single-panel shell, shared with industry onboarding. Async signup, login, OAuth, onboarding continuation, headshot upload, and completion buttons use a centered circular progress indicator. Shared choice controls use white selected states.

Talent birthdays use Material’s direct-input pattern: MM/DD/YYYY with numeric typing and automatic separators, without the browser calendar popup (https://m2.material.io/components/date-pickers/ios). Client and server share strict date-only age validation; incomplete, impossible, future, and under-18 dates cannot complete onboarding. Username availability is debounced with stale-response protection and one inline status. Saving no longer silently appends a suffix to a taken username. Initial onboarding omits resume import and requires a headshot with inline errors. The account-created screen displays the avatar/check badge and only the completion/defer actions.

Validation: `node --experimental-strip-types --test scripts/onboarding-birth-date.test.ts` covers eighteenth-birthday boundaries, leap days, and malformed dates. Browser checks used a temporary local-only UI fixture (removed afterward); verified immediate age blocking, automatic username success, missing-headshot error placement, and final-screen actions. No new account was created during these checks.

Onboarding shows Cancel only on its first step and Back on subsequent steps. Placeholder account names are cleared from new and resumed drafts. Display name follows the entered first/last name until the user customizes it; name tests cover fallback removal and preservation of custom display names.
