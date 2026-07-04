"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close sizing picker" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden ui-card shadow-[var(--shadow-raised)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--ink-soft)] hover:bg-[var(--tone)]"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
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
                  "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition",
                  selected ? "bg-[var(--ink)] text-white" : "text-[var(--ink)] hover:bg-[var(--tone)]",
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
      </div>
    </div>
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
          "flex w-full items-center justify-between gap-3 rounded-[var(--radius-field)] border px-4 py-3 text-left text-sm transition",
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

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-[var(--radius-chip)] border px-4 py-2 text-sm font-medium transition",
              tab === item.id
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <SizingTabPanel fields={getSizingFieldsForTab(tab)} values={values} onChange={updateValues} />
    </div>
  );
}
