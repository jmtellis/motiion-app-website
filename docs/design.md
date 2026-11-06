---
version: alpha
name: Motiion Web
description: Clear, calm workspaces for talent and industry professionals.
colors:
  canvas: "#f5f6f5"
  surface: "#ffffff"
  surface-soft: "#eef2f1"
  surface-hover: "#e7eeec"
  text: "#1c292a"
  muted: "#536366"
  subtle: "#667679"
  border: "#d4dedc"
  control-border: "#7d9091"
  accent: "#006b75"
  accent-hover: "#00535d"
  accent-soft: "#def3f1"
  on-accent: "#ffffff"
  focus: "#007b87"
  success: "#19643a"
  success-soft: "#e2f4e8"
  warning: "#78500b"
  warning-soft: "#fff3d6"
  danger: "#ad243e"
  danger-soft: "#ffedf0"
  info: "#205f91"
  info-soft: "#eaf3fc"
  disabled: "#6c7779"
typography:
  page:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  section:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  card:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  metadata:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: 10px
  card: 16px
  panel: 20px
  pill: 999px
spacing:
  step-1: 4px
  step-2: 8px
  step-3: 12px
  step-4: 16px
  step-5: 20px
  step-6: 24px
  step-8: 32px
  step-12: 48px
components:
  primary-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: 44px
  secondary-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: 44px
  destructive-button:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: 44px
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: 44px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.step-6}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "{spacing.step-6}"
---

# Motiion web design system

## Overview

Motiion is a working environment for dancers, choreographers and industry teams. The product uses a quiet light canvas, clear surfaces, readable Geist typography and deep teal actions. Media carries personality; interface decoration stays restrained. Public marketing may retain its darker editorial brand, while authenticated workspaces share the same practical rules.

This replaces the old dark-only reference. Current rendered product screens and the user's workflow requirements informed the system; no interaction-reference attachments were available in this session. Runtime tokens live in `src/components/ui/system.css`. This document and `design.html` mirror those values; the existing `/admin/design-system` gallery renders actual React components and their states. Legacy `--ds-*`, `--buyer-*` and `--industry-*` names are compatibility aliases in `workspace-controls.css`, not a second system.

## Colors

Use `text` for content, `muted` for secondary content and `subtle` for supporting metadata. Teal identifies an action or selection; it is not a success indicator. Status always includes text or an icon, never color alone. Surface boundaries use `border`; fields use the stronger `control-border`. State text colors pair with their corresponding `*-soft` backgrounds. Text pairs are intended to meet WCAG AA; verify new pairs rather than using arbitrary opacity. Media may use a dark viewer with white controls.

## Typography

Geist is the product family, with the system sans fallback. Page headings are 32px desktop and 26px on compact screens, sections 24px, cards 18px, body 16px, controls 14px and metadata 13px. Use weight 600 for hierarchy; avoid very light type and long uppercase labels. Inputs reach 16px on small screens to avoid mobile browser zoom. Long names wrap or truncate with an accessible full label. Never clip essential status or error text.

## Layout

Use the 4px spacing scale. Default page gutters are 24–32px desktop and 16px mobile; content width is 1280px, reading/forms 680px. Cards adapt to available width without horizontal page scroll. Project work uses Active, Drafts and Archived in a card grid. Filters belong beside the content they affect. Keep only one sticky context/action region per scroll container and account for safe areas. A loaded list stays mounted during profile inspection; mobile inspection becomes a full-height dialog. Do not reset selection, query or list scroll when closing a profile.

## Elevation & Depth

Workspace cards and panels sit on the canvas with `--ui-elevation`: a 1px outer edge plus inset side, top and bottom lines that read as a slight bevel, so containers lift off the background without a heavy drop shadow. Interactive cards step up to `--ui-elevation-hover`. Overlays use `--ui-shadow-overlay`. Content nested inside an elevated surface stays flat. Native dialogs enter the browser top layer, contain focus and make the background inert. Shared overlay code owns scroll locking and focus restoration. Desktop inspection panels allow interaction with the list; mobile panels are modal. Avoid nested drawers—use a compact action dialog or a distinct media viewer.

## Shapes

Every button is a pill (`--ui-radius-button`), including primary, secondary, compact toolbar buttons and round icon buttons. Fields use 10px radii; compact filter dropdowns (`select.ui-select`) are 34px pills with a chevron. Cards are 16px and panels 20px. Do not infer shape using broad class-substring selectors. Icons are 18–20px beside labels and 20–24px for main navigation; icon-only controls need an accessible name and a 44px touch target.

## Components

| Pattern | Implementation | Behavior |
|---|---|---|
| Buttons and links | `.ui-button`, `.ui-button--secondary`, `.ui-button--danger`, `.ui-icon-button` | One primary action per group, pending label, disabled duplicate submits, 44px minimum target. Links navigate; buttons mutate/open. |
| Forms | `ui/Field.tsx` | Label, hint and validation are associated; errors use `aria-invalid` and alert feedback. Preserve entered values after failures. |
| Tabs and filters | `ui/chips.css` (`.ui-chip-row`, `.ui-chip`), `dashboard/SegmentedControl.tsx`, `dashboard/UnderlineTabs.tsx` | Tabs, segmented controls and filters render as pill chips; the selected chip is near-black with white text and may show a count. Switching swaps content with the `ui-swap` transition. Roving tab stop, arrows/Home/End. Route-backed filters preserve browser navigation. |
| Banners | `ui/Banner.tsx` (`.ui-banner`) | Tones: info, success, warning, critical. Saturated tinted background, tone icon, title, short body and at most one tinted pill action. Critical uses `role=alert`. |
| Media cards | `.ui-media-card` | White, elevated web card: image on top, eyebrow, title, one or two lines of copy and a footer with a pill action. Used for events, featured cast, classes and projects. |
| Dialogs | `ui/Dialog.tsx`, dashboard `Modal`, talent `ResponsiveModal` | Native focus containment, Escape, backdrop, focus restoration and counted body-scroll lock. Caller blocks close during pending writes and confirms discarding meaningful drafts. |
| Inspection | `workspace/WorkspaceSidePanel.tsx`, `CollectionProfilePanel` | Desktop context retained; mobile full height, deep-link query and browser-back close for roster profiles. |
| Empty/error | `ui/EmptyState.tsx` with `illustration`, `ui/EmptyIllustration.tsx`, `.ui-notice` | Empty states show a flat illustration, a title, one sentence and a clear primary action (optionally one secondary). Use `compact` inside sections. Failure offers retry and preserves existing content. Permission failures never pretend to be empty. |
| Avatar/media | `ui/Avatar.tsx`, `ProfileOverlays` | Stable dimensions, initials on failed images, lazy list images. Media viewer has named controls and keyboard navigation. |
| Profile | shared talent profile sheet, professional identity sections | Same surfaces/spacing, role-specific fields. Explicit visibility and editing feedback. |
| Menus/search | roster menus, shared search/voice control | Named controls, Escape closes, keyboard access; listening/processing/cancel/retry states and editable typed alternative. |
| Notifications | existing ToastProvider, inline notices | Success follows confirmed writes; failures retain drafts. Announce status without moving focus. |
| Loading | page skeletons, button pending, retained data refresh | Skeleton matches geometry. Initial, refresh, empty and failed states are distinct. Never add a minimum spinner duration. |

Motion is limited to 160ms opacity/short entry transitions. Hover and pressed states use surface changes, never a large positional jump. Every interactive control exposes a visible 2px focus ring with offset. `prefers-reduced-motion` disables nonessential transitions and animation. Disabled states retain readable labels; focus remains on an available next action after completion.

## Do's and Don'ts

- Do preserve context, drafts, selected talent and meaningful browser-back behavior.
- Do use semantic tokens and shared components for shared behavior.
- Do show recovery where the error occurred and distinguish authorization from unavailable data.
- Do keep account email confirmation, industry approval, identity verification and paid plans distinct.
- Do inspect desktop, tablet and phone rendering, keyboard access and long content.
- Don't encode errors or selection in color alone.
- Don't overlay competing sticky headers or nest full drawers.
- Don't hide failed network requests behind empty states or fake successful feedback.
- Don't reintroduce booking contracts or payments through legacy labels or links.
- Don't normalize different workflows into identical layouts or animate routine work unnecessarily.
