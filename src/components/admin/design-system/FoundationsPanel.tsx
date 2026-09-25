"use client";

import { PreviewFrame } from "./PreviewFrame";

/** Dark MotiionColor swatches — mirrored from iOS Colors.swift */
const COLOR_TOKENS = [
  { name: "backgroundDefault", varName: "--ds-background-default" },
  { name: "surfaceDefault", varName: "--ds-surface-default" },
  { name: "surfaceHigh", varName: "--ds-surface-high" },
  { name: "surfaceAccent", varName: "--ds-surface-accent" },
  { name: "surfaceTint", varName: "--ds-surface-tint" },
  { name: "textDefault", varName: "--ds-text-default" },
  { name: "textLow", varName: "--ds-text-low" },
  { name: "textDisabled", varName: "--ds-text-disabled" },
  { name: "textAccent", varName: "--ds-text-accent" },
  { name: "borderDefault", varName: "--ds-border-default" },
  { name: "borderHigh", varName: "--ds-border-high" },
  { name: "borderLow", varName: "--ds-border-low" },
  { name: "primary500", varName: "--ds-primary-500" },
  { name: "primary600", varName: "--ds-primary-600" },
  { name: "error500", varName: "--ds-error-500" },
  { name: "buttonSurfaceDefault", varName: "--ds-button-surface-default" },
  { name: "buttonSurfaceAccent", varName: "--ds-button-surface-accent" },
  { name: "accentClass", varName: "--ds-accent-class" },
  { name: "accentEvent", varName: "--ds-accent-event" },
  { name: "accentJob", varName: "--ds-accent-job" },
  { name: "accentSession", varName: "--ds-accent-session" },
  { name: "accentSubmission", varName: "--ds-accent-submission" },
] as const;

const RADIUS_TOKENS = [
  { name: "sm", varName: "--ds-radius-sm" },
  { name: "md", varName: "--ds-radius-md" },
  { name: "button", varName: "--ds-radius-button" },
  { name: "lg / card", varName: "--ds-radius-card" },
  { name: "sheet", varName: "--ds-radius-sheet" },
  { name: "full", varName: "--ds-radius-full" },
] as const;

const SPACE_TOKENS = [
  { name: "xs", varName: "--ds-space-xs" },
  { name: "sm", varName: "--ds-space-sm" },
  { name: "md", varName: "--ds-space-md" },
  { name: "lg", varName: "--ds-space-lg" },
  { name: "xl", varName: "--ds-space-xl" },
  { name: "xxl", varName: "--ds-space-xxl" },
  { name: "xxxl", varName: "--ds-space-xxxl" },
] as const;

export function ColorsSection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Dark appearance values from iOS{" "}
        <code className="font-mono text-[11px]">MotiionColor</code> (
        <code className="font-mono text-[11px]">Colors.swift</code>). The web product canvas uses
        near-black in dark mode; light mode uses iOS{" "}
        <code className="font-mono text-[11px]">backgroundDefault</code> (#F4FCFF). Toggle appearance
        in the sidebar.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div className="overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)]">
          <div className="h-16 w-full bg-[var(--ds-background)]" aria-hidden />
          <div className="space-y-0.5 px-2.5 py-2">
            <p className="truncate text-xs font-medium text-[var(--ds-text-default)]">
              web canvas
            </p>
            <p className="truncate font-mono text-[10px] text-[var(--ds-muted)]">--ds-background</p>
          </div>
        </div>
        {COLOR_TOKENS.map((token) => (
          <div
            key={token.name}
            className="overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)]"
          >
            <div className="h-16 w-full" style={{ background: `var(${token.varName})` }} aria-hidden />
            <div className="space-y-0.5 px-2.5 py-2">
              <p className="truncate text-xs font-medium text-[var(--ds-text-default)]">{token.name}</p>
              <p className="truncate font-mono text-[10px] text-[var(--ds-muted)]">{token.varName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TypographySection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Product UI uses Montserrat via <code className="font-mono text-[11px]">--ds-font-product</code>,
        matching iOS product hierarchy. Size steps below approximate MotiionTypography headers/body.
      </p>
      <div className="space-y-5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 font-[family-name:var(--ds-font-product)]">
        <p className="text-[2.5rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--ds-text-default)]">
          Header 1 · 40
        </p>
        <p className="text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--ds-text-default)]">
          Header 2 · 32
        </p>
        <p className="text-[1.5rem] font-semibold leading-[1.2] text-[var(--ds-text-default)]">
          Header 3 · 24
        </p>
        <p className="text-[1.125rem] font-semibold leading-[1.2] text-[var(--ds-text-default)]">
          Header 4 · 18
        </p>
        <p className="text-base leading-relaxed text-[var(--ds-text-default)]">
          Body medium · 16 — professional creative software for the dance industry.
        </p>
        <p className="text-sm leading-relaxed text-[var(--ds-text-low)]">
          Body small · 14 — secondary copy uses textLow.
        </p>
        <p className="text-xs font-medium leading-relaxed text-[var(--ds-text-disabled)]">
          Body xSmall / label · 12 — textDisabled for de-emphasized metadata.
        </p>
      </div>
    </div>
  );
}

export function RadiusSection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        MotiionRadius — sm 8, md 12, button 14, card/lg 16, sheet 26, full.
      </p>
      <div className="flex flex-wrap gap-5">
        {RADIUS_TOKENS.map((token) => (
          <div key={token.varName} className="flex flex-col items-center gap-2">
            <div
              className="size-16 border border-[var(--ds-border-high)] bg-[var(--ds-surface-default)]"
              style={{ borderRadius: `var(${token.varName})` }}
            />
            <code className="font-mono text-[10px] text-[var(--ds-muted)]">{token.name}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpacingSection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        MotiionSpacing — xs 4 → xxxl 40.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        {SPACE_TOKENS.map((token) => (
          <div key={token.varName} className="flex flex-col items-center gap-2">
            <div
              className="w-8 rounded-sm bg-[var(--ds-primary-500)]"
              style={{ height: `var(${token.varName})` }}
            />
            <code className="font-mono text-[10px] text-[var(--ds-muted)]">{token.name}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Prefer per-section exports. */
export function FoundationsPanel() {
  return (
    <div className="space-y-12">
      <ColorsSection />
      <TypographySection />
      <RadiusSection />
      <SpacingSection />
      <PreviewFrame title="Buttons" path="globals.css (.btn-*)" surface="light">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary">
            Primary
          </button>
          <button type="button" className="btn-secondary">
            Secondary
          </button>
          <button type="button" className="btn-outline">
            Outline
          </button>
        </div>
      </PreviewFrame>
    </div>
  );
}
