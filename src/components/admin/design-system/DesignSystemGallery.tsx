"use client";

import Link from "next/link";
import { WorkflowStates } from "./WorkflowStates";
import { useMemo, useState } from "react";

import type { CatalogSampleProfile } from "@/lib/design-system/sample-media";
import {
  ColorsSection,
  RadiusSection,
  SpacingSection,
  TypographySection,
} from "./FoundationsPanel";
import {
  AuthSection,
  AvatarsSection,
  BadgesSection,
  ButtonsSection,
  DividersSection,
  EmptyStatesSection,
  HeadersSection,
  InputsSection,
  PickersSection,
  SelectionSection,
  TalentCardsSection,
} from "./SafePreviews";


type NavSection = {
  id: string;
  label: string;
  group: "Foundations" | "Components";
};

const NAV: NavSection[] = [
  { id: "workflow-states", label: "Workflow states", group: "Components" },
  { id: "colors", label: "Colors", group: "Foundations" },
  { id: "typography", label: "Typography", group: "Foundations" },
  { id: "radius", label: "Radius", group: "Foundations" },
  { id: "spacing", label: "Spacing", group: "Foundations" },
  { id: "buttons", label: "Buttons", group: "Components" },
  { id: "inputs", label: "Inputs", group: "Components" },
  { id: "selection", label: "Selection", group: "Components" },
  { id: "pickers", label: "Pickers & sliders", group: "Components" },
  { id: "dividers", label: "Dividers", group: "Components" },
  { id: "avatars", label: "Avatars", group: "Components" },
  { id: "auth", label: "Auth", group: "Components" },
  { id: "empty-states", label: "Empty states", group: "Components" },
  { id: "headers", label: "Headers", group: "Components" },
  { id: "badges", label: "Badges & chips", group: "Components" },
  { id: "talent-cards", label: "Talent cards", group: "Components" },
];

export function DesignSystemGallery({ sample }: { sample: CatalogSampleProfile }) {
  const [activeId, setActiveId] = useState("workflow-states");

  const active = useMemo(
    () => NAV.find((item) => item.id === activeId) ?? NAV[0],
    [activeId],
  );

  const foundationItems = NAV.filter((item) => item.group === "Foundations");
  const componentItems = NAV.filter((item) => item.group === "Components");

  return (
    <div
      className="theme-ds-light product-reference flex min-h-screen bg-[var(--ui-canvas)] text-[var(--ui-text)]"
    >
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[var(--ds-border)] bg-[var(--ds-surface)] md:flex">
        <div className="border-b border-[var(--ds-border)] px-4 py-5">
          <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-[var(--ds-muted)] uppercase">
            Admin
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight text-[var(--ds-text-default)]">
            Design system
          </h1>
          <Link
            href="/admin/analytics"
            className="mt-3 inline-block text-xs text-[var(--ds-muted)] underline-offset-2 hover:text-[var(--ds-text-default)] hover:underline"
          >
            ← Analytics
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Design system sections">
          <p className="mb-2 px-2 font-mono text-[10px] font-medium tracking-[0.12em] text-[var(--ds-subtle)] uppercase">
            Foundations
          </p>
          <ul className="mb-6 space-y-0.5">
            {foundationItems.map((item) => (
              <li key={item.id}>
                <NavButton
                  label={item.label}
                  active={activeId === item.id}
                  onClick={() => setActiveId(item.id)}
                />
              </li>
            ))}
          </ul>

          <p className="mb-2 px-2 font-mono text-[10px] font-medium tracking-[0.12em] text-[var(--ds-subtle)] uppercase">
            Components
          </p>
          <ul className="space-y-0.5">
            {componentItems.map((item) => (
              <li key={item.id}>
                <NavButton
                  label={item.label}
                  active={activeId === item.id}
                  onClick={() => setActiveId(item.id)}
                />
              </li>
            ))}
          </ul>
        </nav>


      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-[var(--ds-border)] px-4 py-4 md:px-10">
          <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
            <h1 className="text-base font-semibold text-[var(--ds-text-default)]">Design system</h1>

          </div>
          <label className="mb-3 block md:hidden">
            <span className="sr-only">Section</span>
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm text-[var(--ds-text-default)]"
            >
              <optgroup label="Foundations">
                {foundationItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Components">
                {componentItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-[var(--ds-muted)] uppercase">
                {active.group}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ds-text-default)]">
                {active.label}
              </h2>
            </div>

          </div>
        </div>

        <div className="px-4 py-8 md:px-10 md:py-10">
          {activeId === "workflow-states" ? <WorkflowStates /> : null}
          {activeId === "colors" ? <ColorsSection /> : null}
          {activeId === "typography" ? <TypographySection /> : null}
          {activeId === "radius" ? <RadiusSection /> : null}
          {activeId === "spacing" ? <SpacingSection /> : null}
          {activeId === "buttons" ? <ButtonsSection /> : null}
          {activeId === "inputs" ? <InputsSection /> : null}
          {activeId === "selection" ? <SelectionSection /> : null}
          {activeId === "pickers" ? <PickersSection /> : null}
          {activeId === "dividers" ? <DividersSection /> : null}
          {activeId === "avatars" ? <AvatarsSection sample={sample} /> : null}
          {activeId === "auth" ? <AuthSection /> : null}
          {activeId === "empty-states" ? <EmptyStatesSection /> : null}
          {activeId === "headers" ? <HeadersSection /> : null}
          {activeId === "badges" ? <BadgesSection /> : null}
          {activeId === "talent-cards" ? <TalentCardsSection sample={sample} /> : null}
        </div>
      </main>
    </div>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "w-full rounded-lg bg-[var(--ds-button-surface-default)] px-3 py-2 text-left text-sm font-medium text-[var(--ds-on-button-surface-default)]"
          : "w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--ds-muted)] transition hover:bg-[var(--ds-surface-tint)] hover:text-[var(--ds-text-default)]"
      }
    >
      {label}
    </button>
  );
}
