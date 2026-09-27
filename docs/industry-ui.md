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
