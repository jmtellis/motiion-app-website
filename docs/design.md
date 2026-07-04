---
version: alpha
name: Motiion
description: A dark, editorial, keyboard-first design system for professional creative software serving the dance industry.
colors:
  background: "#0A0A0A"
  surface: "#151515"
  surface-raised: "#1E1E1E"
  overlay: "#000000"
  border: "#262626"
  border-strong: "#3A3A3A"
  primary: "#FAFAFA"
  on-primary: "#0A0A0A"
  accent: "#2DD4BF"
  on-accent: "#04231E"
  accent-soft: "#0C2A26"
  on-background: "#FAFAFA"
  on-surface: "#EAEAEA"
  muted: "#8A8A8A"
  subtle: "#5A5A5A"
  success: "#3FB950"
  warning: "#E3A008"
  error: "#F04438"
  info: "#4A9EFF"
  on-success: "#0A0A0A"
  on-warning: "#0A0A0A"
  on-error: "#0A0A0A"
  on-info: "#0A0A0A"
typography:
  display:
    fontFamily: Geist
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.03em
  h1:
    fontFamily: Geist
    fontSize: 2.5rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  h3:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
  mono-label:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.08em
  mono:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  0: 0px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 24px
  6: 32px
  7: 48px
  8: 64px
  9: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "#E6E6E6"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-secondary-hover:
    backgroundColor: "#2A2A2A"
    textColor: "{colors.on-background}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 40px
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 40px
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.subtle}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  input-focus:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px 12px
    height: 28px
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px 12px
    height: 28px
  badge-verified:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.mono-label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  badge-meta:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.mono-label}"
    rounded: "{rounded.sm}"
    padding: 2px 6px
  card-talent:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  card-project:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
  nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  nav-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-background}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "{spacing.6}"
  kbd:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    typography: "{typography.mono-label}"
    rounded: "{rounded.sm}"
    padding: 2px 6px
---

# Motiion Design System

## Overview

Motiion is the operating system for the professional dance industry — a web app (sharing one backend with an iOS app) used by dancers and choreographers to manage their careers and by casting/creative professionals to discover, hire, and organize talent. The interface should feel like **professional creative software** — Linear, Figma, Raycast — not a recruiting marketplace. Emotionally: **confident, premium, and quiet**, a calm dark canvas that lets talent media and data be the color. The system is dark-first and keyboard-first. Two anti-patterns to hold the line on above all: it must never look like a **job board / listing site**, and it must never get **loud** — no heavy shadows, glossy gradients, or emoji-and-color clutter competing with the work.

## Colors

The palette is a near-black neutral spine with a single warm accent. `background` (`#0A0A0A`) is the canvas; `surface` (`#151515`) and `surface-raised` (`#1E1E1E`) are cards and inputs, separated from the canvas by **hairline borders** (`border` `#262626`, `border-strong` `#3A3A3A`) rather than shadow. Text runs `on-background`/`on-surface` (near-white) for primary, `muted` (`#8A8A8A`) for secondary, and `subtle` (`#5A5A5A`) for de-emphasized metadata — a three-step contrast ladder that carries most of the hierarchy. Interactive emphasis is **white**: `primary` (`#FAFAFA`) on `on-primary` (`#0A0A0A`) is the main CTA, borrowed straight from the references. The brand `accent` (`#2DD4BF`, cool teal) is used sparingly — ambient glows, the verified badge, focus rings, and rare high-intent moments — never as a default button fill. Its cool, technical character reinforces the "professional creative software" feel and sits calmly against the neutral dark canvas. `accent-soft` (`#0C2A26`) is a teal-tinted dark surface for the verified badge background. Semantic colors (`success`, `warning`, `error`, `info`) are reserved strictly for status; `success` green and the teal `accent` are kept perceptually distinct (accent skews cyan, success skews leaf-green) so brand emphasis never reads as a status. All body text pairings meet WCAG AA on the dark canvas (`muted` on `background` ≈ 5.4:1); reserve `subtle` for large or non-essential text only.

## Typography

Two families do all the work. **Geist** (a modern grotesque in the Inter/Neue-Montreal lineage) carries display through caption — tight negative tracking on large sizes (`-0.02` to `-0.03em`) for the editorial, confident headline feel seen in the references, and neutral, comfortable settings for body. **Geist Mono** is a *functional* accent, not decoration: it labels the technical metadata dance hiring runs on — union status, height and attributes, IDs, availability — and renders keyboard shortcuts. `mono-label` is small, medium-weight, and letter-spaced (`0.08em`) for uppercase-style micro-labels; `mono` is for inline data and IDs. The scale steps `display → h1 → h2 → h3 → body-lg → body → body-sm → caption`, each with a clear job: `display`/`h1` for hero and page titles, `h2`/`h3` for section and card headings, `body` as the default, `body-sm` as the dense-UI default (tables, filters, cards), `caption` for chips and helper text. Never introduce a serif or a third sans.

## Layout

Spacing follows a strict **4px base** scale (`4, 8, 12, 16, 24, 32, 48, 64, 96`) so rhythm stays consistent and predictable — a requirement for keyboard-driven, information-dense screens. Density is **contextual**: marketing surfaces breathe (generous `48–96px` section rhythm, wide margins, lots of black), while the app is **comfortable-to-tight** (`8–24px`) because it's a professional tool where scanning speed matters. Use a 12-column max-width container (~1200–1280px) for marketing and a full-width, panelized layout (filter rail + results + detail panel) for the app's power surfaces like the talent navigator. Keep gutters consistent within a context; don't improvise one-off spacing.

## Elevation & Depth

Depth is expressed through **contrast and hairline borders, not shadows**. Layers read as background → surface → surface-raised, each a step lighter, each optionally outlined by a `border`/`border-strong` hairline. The only "glow" in the system is a soft, low-opacity **radial wash of `accent`** used behind hero moments (as in the references) — ambient light, never a drop shadow on a component. Modals and popovers sit on a near-opaque `overlay` scrim over the canvas and use `surface` with a hairline border. Avoid material-style elevation entirely: no soft grey box-shadows, no glossy layering. Flatness plus precise borders is the premium signal here.

## Shapes

Corner radius is calm and consistent: **`md` (8px)** for buttons and inputs, **`lg` (14px)** for cards and panels, **`xl` (20px)** for modals and large containers, and **`full`** for chips, pills, badges, and avatars. Sharp `none` (0px) is reserved for full-bleed dividers and data tables where crisp edges aid scanning. The mix — softly rounded containers with fully-rounded interactive pills — reads modern and approachable without ever becoming bubbly. Don't round buttons more than their containers; the pill treatment belongs to chips and badges, not primary actions.

## Components

Buttons come in four intents: `button-primary` (white, the main CTA), `button-secondary` (raised surface, for secondary actions), `button-ghost` (transparent, muted text that brightens on hover — the workhorse for toolbars and dense UI), and `button-accent` (amber, reserved for rare high-intent moments). Each has explicit hover and disabled states (`button-primary-hover`, `button-secondary-hover`, `button-ghost-hover`, `button-disabled`); hover lightens the surface one step, disabled drops text to `subtle`. `input` uses `surface` with a hairline border; on focus (`input-focus`) it raises to `surface-raised` and gains an `accent` focus ring — focus must always be unmistakable because the product is keyboard-first. `chip` is a fully-rounded filter/tag pill in muted text; `chip-active` flips to the white `primary` fill to signal selection. `badge-verified` uses `mono-label` in `accent` on `accent-soft` — the trust marker on talent profiles; `badge-meta` renders inline metadata (union, height, availability) in muted mono. `card-talent` and `card-project` are `lg`-radius surfaces with hairline borders, differing only in padding density. `nav-tab`/`nav-tab-active` drive the tabbed app shell. `modal` is an `xl`-radius surface on the overlay scrim. `kbd` renders keyboard-shortcut keys in `mono-label` — surface shortcut hints throughout, since power users navigate by keyboard.

## Do's and Don'ts

**Do**
- Let the dark canvas and the talent's own media carry the color; keep chrome neutral.
- Use white (`primary`) for the main action on a screen; reserve `accent` teal for glows, the verified badge, and focus.
- Express depth with hairline borders and one-step-lighter surfaces, not shadows.
- Use `Geist Mono` for technical metadata (union, height, IDs, availability) and keyboard shortcuts — it signals a pro tool.
- Make focus states unmistakable (accent ring) — the product is keyboard-first.
- Keep to the 4px spacing scale and the defined radius steps.

**Don't**
- Don't let it look like a job board or listing site — no dense rows of generic listings, no marketplace badges.
- Don't use soft grey drop-shadows, glossy gradients, or material-style elevation.
- Don't flood the UI with color, emoji, or multiple accents — one warm accent, used sparingly.
- Don't introduce a serif, a third sans, or bump body copy below `body-sm` for essential text.
- Don't fill primary buttons with `accent` by default; teal is an emphasis, not the default action color.
- Don't improvise off-scale spacing or radii to fix a one-off layout.
