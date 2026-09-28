"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { createPortal } from "react-dom";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { ProfileSectionTabs } from "./ProfileSectionTabs";

import {
  type SizingFieldConfig,
  type SizingTab,
  type SizingValues,
  buildSizingSummary,
  getSizingFieldsForTab,
  parseSizingSummary,
} from "@/lib/onboarding/sizing-options";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SizingValuePicker({
  field,
  value,
  open,
  onClose,
  onChange,
}: {
  field: SizingFieldConfig;
  value: string;
  open: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const title = field.units ? `${field.label} (${field.units})` : field.label;

  if (!open) return null;

  return createPortal(
    <div className="profile-sizing-dialog">
    <Modal open={open} onClose={onClose} title={title}>
        <div data-lenis-prevent className="max-h-[50dvh] overflow-y-auto overscroll-contain p-2">
          {field.options.map((option) => {
            const selected = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition",
                  selected ? "bg-[var(--ink)] text-[var(--surface-card)]" : "text-[var(--ink)] hover:bg-[var(--tone)]",
                )}
              >
                <span>{option}</span>
                {selected ? <span className="text-xs opacity-80">Selected</span> : null}
              </button>
            );
          })}
        </div>

        {value ? (
          <div className="border-t border-[var(--line)] p-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClose();
              }}
              className="w-full rounded-full px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--tone)] hover:text-[var(--ink)]"
            >
              Clear {field.label.toLowerCase()}
            </button>
          </div>
        ) : null}
    </Modal>
    </div>, document.body
  );
}

function SizingFieldChip({
  field,
  value,
  onChange,
}: {
  field: SizingFieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filled = Boolean(value.trim());

  const displayValue = filled
    ? `${field.placeholder} — ${value}`
    : `Add ${field.label.toLowerCase()}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-full border px-4 py-3 text-left text-sm transition",
          filled
            ? "border-[var(--ink)]/20 bg-[var(--tone)] text-[var(--ink)]"
            : "border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]",
        )}
      >
        <span className="truncate">{displayValue}</span>
        {filled ? (
          <Pencil className="size-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
        ) : (
          <Plus className="size-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
        )}
      </button>

      <SizingValuePicker
        field={field}
        value={value}
        open={open}
        onClose={() => setOpen(false)}
        onChange={onChange}
      />
    </>
  );
}

function SizingTabPanel({
  fields,
  values,
  onChange,
}: {
  fields: SizingFieldConfig[];
  values: SizingValues;
  onChange: (values: SizingValues) => void;
}) {
  const filled = fields.filter((field) => values[field.key]?.trim());
  const empty = fields.filter((field) => !values[field.key]?.trim());

  return (
    <div className="space-y-3">
      {filled.map((field) => (
        <SizingFieldChip
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(next) => onChange({ ...values, [field.key]: next })}
        />
      ))}
      {filled.length > 0 && empty.length > 0 ? <div className="border-t border-[var(--line)] py-1" /> : null}
      {empty.map((field) => (
        <SizingFieldChip
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(next) => onChange({ ...values, [field.key]: next })}
        />
      ))}
    </div>
  );
}

export function SizingEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (sizing: string) => void;
}) {
  const [tab, setTab] = useState<SizingTab>("general");
  const values = useMemo(() => parseSizingSummary(value), [value]);

  function updateValues(next: SizingValues) {
    onChange(buildSizingSummary(next));
  }

  const tabs: Array<{ id: SizingTab; label: string }> = [
    { id: "general", label: "General" },
    { id: "men", label: "Men" },
    { id: "women", label: "Women" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--ink-soft)]">Input any sizing metrics that apply to you.</p>

      <ProfileSectionTabs items={tabs} value={tab} onChange={value => setTab(value as SizingTab)}>
      <SizingTabPanel fields={getSizingFieldsForTab(tab)} values={values} onChange={updateValues} />
      </ProfileSectionTabs>
    </div>
  );
}
