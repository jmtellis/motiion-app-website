"use client";

import { PreviewFrame } from "./PreviewFrame";

/** Runtime semantic workspace tokens. */
const COLOR_TOKENS = [
  { name: "canvas", varName: "--ui-canvas" },
  { name: "surface", varName: "--ui-surface" },
  { name: "surface-soft", varName: "--ui-surface-soft" },
  { name: "surface-hover", varName: "--ui-surface-hover" },
  { name: "text", varName: "--ui-text" },
  { name: "muted", varName: "--ui-muted" },
  { name: "subtle", varName: "--ui-subtle" },
  { name: "border", varName: "--ui-border" },
  { name: "control-border", varName: "--ui-control-border" },
  { name: "accent", varName: "--ui-accent" },
  { name: "accent-hover", varName: "--ui-accent-hover" },
  { name: "accent-soft", varName: "--ui-accent-soft" },
  { name: "on-accent", varName: "--ui-on-accent" },
  { name: "focus", varName: "--ui-focus" },
  { name: "success", varName: "--ui-success" },
  { name: "success-soft", varName: "--ui-success-soft" },
  { name: "warning", varName: "--ui-warning" },
  { name: "warning-soft", varName: "--ui-warning-soft" },
  { name: "danger", varName: "--ui-danger" },
  { name: "danger-soft", varName: "--ui-danger-soft" },
  { name: "info", varName: "--ui-info" },
  { name: "info-soft", varName: "--ui-info-soft" },
  { name: "disabled", varName: "--ui-disabled" },
] as const;

const RADIUS_TOKENS = [
 {name:"control",varName:"--ui-radius-control"}, {name:"card",varName:"--ui-radius-card"}, {name:"panel",varName:"--ui-radius-panel"}, {name:"pill",varName:"--ui-radius-pill"}
] as const;
const SPACE_TOKENS = [1,2,3,4,5,6,8,12].map(n=>({name:String(n),varName:`--ui-space-${n}`}));

export function ColorsSection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Semantic workspace tokens from system.css. Text, controls and status surfaces share these values across both user roles.
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
        Product UI uses Geist via <code className="font-mono text-[11px]">--ds-font-product</code>,
        with a compact, readable hierarchy for the web workspace.
      </p>
      <div className="space-y-5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 font-[family-name:var(--ds-font-product)]">
        <p className="text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--ui-text)]">Page title · 32</p>
        <p className="text-[1.5rem] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--ui-text)]">Section title · 24</p>
        <p className="text-[1.125rem] font-semibold leading-[1.4] text-[var(--ui-text)]">Card title · 18</p>
        <p className="text-base leading-relaxed text-[var(--ds-text-default)]">
          Body medium · 16 — professional creative software for the dance industry.
        </p>
        <p className="text-sm leading-relaxed text-[var(--ds-text-low)]">
          Control / compact body · 14 — secondary copy uses the muted token.
        </p>
        <p className="text-[13px] font-medium leading-relaxed text-[var(--ui-subtle)]">
          Metadata · 13 — supporting details remain readable.
        </p>
      </div>
    </div>
  );
}

export function RadiusSection() {
  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Controls 10px, cards 16px, panels 20px. Pills are reserved for badges.
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
        A 4px rhythm, with larger 32px and 48px gaps between major sections.
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
