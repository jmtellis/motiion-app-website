"use client";

import { useEffect, useId, useState } from "react";

import {
  type DateBlock,
  type FieldError,
  type FieldSpec,
  formatBps,
  formatCents,
  type ModuleSpec,
  type ModuleValue,
} from "@/lib/booking/deal-memo";

function centsToText(cents: unknown) {
  return typeof cents === "number" && Number.isFinite(cents) && cents > 0 ? (cents / 100).toFixed(cents % 100 ? 2 : 0) : "";
}

function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: unknown;
  onChange: (cents: number) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const [text, setText] = useState(centsToText(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    // Mirror external resets (counter, reset) without clobbering in-progress typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!focused) setText(centsToText(value));
  }, [value, focused]);
  return (
    <div className="deal-memo__money">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9.]/g, "");
          setText(next);
          const n = Number(next);
          onChange(next === "" || !Number.isFinite(n) ? 0 : Math.round(n * 100));
        }}
      />
    </div>
  );
}

function DateBlocksEditor({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: Extract<FieldSpec, { type: "date_blocks" }>;
  value: unknown;
  onChange: (blocks: DateBlock[]) => void;
  idPrefix: string;
}) {
  const blocks = Array.isArray(value) ? (value as DateBlock[]) : [];
  const update = (index: number, patch: Partial<DateBlock>) =>
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  return (
    <div className="deal-memo__blocks">
      {blocks.map((block, index) => (
        <fieldset className="deal-memo__block" key={index}>
          <legend className="deal-memo__sr-only">Date block {index + 1}</legend>
          <label className="deal-memo__field">
            <span>Type</span>
            <select value={block.kind} onChange={(e) => update(index, { kind: e.target.value })}>
              <option value="">Choose</option>
              {field.kinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="deal-memo__field">
            <span>Start</span>
            <input type="date" value={block.start_date} onChange={(e) => update(index, { start_date: e.target.value })} />
          </label>
          <label className="deal-memo__field">
            <span>End</span>
            <input type="date" value={block.end_date} min={block.start_date || undefined} onChange={(e) => update(index, { end_date: e.target.value })} />
          </label>
          <label className="deal-memo__field">
            <span>Location</span>
            <input type="text" value={block.location} maxLength={120} onChange={(e) => update(index, { location: e.target.value })} />
          </label>
          <button
            type="button"
            className="deal-memo__btn"
            data-variant="secondary"
            data-size="small"
            aria-label={`Remove date block ${index + 1}`}
            onClick={() => onChange(blocks.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </fieldset>
      ))}
      {blocks.length < field.maxItems ? (
        <div>
          <button
            type="button"
            id={`${idPrefix}-add-block`}
            className="deal-memo__btn"
            data-variant="secondary"
            data-size="small"
            onClick={() => onChange([...blocks, { kind: "tour", start_date: "", end_date: "", location: "" }])}
          >
            Add date block
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Editable fields for one module, typed by the template schema (no free-form contract text). */
export function ModuleFieldsEditor({
  spec,
  value,
  onChange,
  errors = [],
}: {
  spec: ModuleSpec;
  value: ModuleValue;
  onChange: (next: ModuleValue) => void;
  errors?: FieldError[];
}) {
  const baseId = useId();
  if (!spec.fields.length) return null;
  const set = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const errorFor = (key: string) => errors.find((e) => e.field === key)?.message;

  return (
    <div className="deal-memo__fields">
      {spec.fields.map((field) => {
        const id = `${baseId}-${field.key}`;
        const error = errorFor(field.key);
        const errorId = error ? `${id}-error` : undefined;
        const current = value[field.key];
        const errorNode = error ? (
          <span id={errorId} className="deal-memo__field-error">
            {error}
          </span>
        ) : null;

        switch (field.type) {
          case "text":
            return (
              <label key={field.key} className="deal-memo__field" htmlFor={id}>
                <span>
                  {field.label}
                  {field.required ? " (required)" : ""}
                </span>
                <input
                  id={id}
                  type="text"
                  value={typeof current === "string" ? current : ""}
                  maxLength={field.maxLength}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={errorId}
                  onChange={(e) => set(field.key, e.target.value)}
                />
                {errorNode}
              </label>
            );
          case "enum":
            return (
              <label key={field.key} className="deal-memo__field" htmlFor={id}>
                <span>{field.label}</span>
                <select
                  id={id}
                  value={typeof current === "string" ? current : ""}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={errorId}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errorNode}
              </label>
            );
          case "multi": {
            const picked = Array.isArray(current) ? (current as string[]) : [];
            return (
              <fieldset key={field.key} className="deal-memo__field" style={{ gridColumn: "1 / -1" }}>
                <legend>{field.label}</legend>
                <div className="deal-memo__options">
                  {field.options.map((option) => (
                    <label key={option.value} className="deal-memo__check">
                      <input
                        type="checkbox"
                        checked={picked.includes(option.value)}
                        onChange={(e) =>
                          set(
                            field.key,
                            e.target.checked ? [...picked, option.value] : picked.filter((v) => v !== option.value),
                          )}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {errorNode}
              </fieldset>
            );
          }
          case "money":
            return (
              <div key={field.key} className="deal-memo__field">
                <label htmlFor={id}>
                  <span>{field.label}</span>
                </label>
                <MoneyInput id={id} value={current} invalid={Boolean(error)} describedBy={errorId} onChange={(cents) => set(field.key, cents)} />
                {errorNode}
              </div>
            );
          case "int":
            return (
              <label key={field.key} className="deal-memo__field" htmlFor={id}>
                <span>
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                </span>
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  step={1}
                  value={typeof current === "number" ? current : 0}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={errorId}
                  onChange={(e) => set(field.key, e.target.value === "" ? 0 : Math.trunc(Number(e.target.value)))}
                />
                {errorNode}
              </label>
            );
          case "bps":
            return (
              <label key={field.key} className="deal-memo__field" htmlFor={id}>
                <span>{field.label} (%)</span>
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={field.min / 100}
                  max={field.max / 100}
                  step={0.5}
                  value={typeof current === "number" ? current / 100 : 0}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={errorId}
                  onChange={(e) => set(field.key, e.target.value === "" ? 0 : Math.round(Number(e.target.value) * 100))}
                />
                {errorNode}
              </label>
            );
          case "bool":
            return (
              <label key={field.key} className="deal-memo__check" style={{ gridColumn: "1 / -1" }}>
                <input type="checkbox" checked={current === true} onChange={(e) => set(field.key, e.target.checked)} />
                {field.label}
              </label>
            );
          case "date_blocks":
            return (
              <fieldset key={field.key} className="deal-memo__field" style={{ gridColumn: "1 / -1" }}>
                <legend>{field.label}</legend>
                <DateBlocksEditor field={field} value={current} onChange={(blocks) => set(field.key, blocks)} idPrefix={id} />
                {errorNode}
              </fieldset>
            );
        }
      })}
    </div>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "—";
  return DATE_FMT.format(new Date(`${iso}T00:00:00Z`));
}

export function formatFieldValue(field: FieldSpec, raw: unknown): string {
  switch (field.type) {
    case "text":
      return typeof raw === "string" && raw.trim() ? raw : "—";
    case "enum":
      return field.options.find((o) => o.value === raw)?.label ?? "—";
    case "multi": {
      const labels = (Array.isArray(raw) ? raw : []).map((v) => field.options.find((o) => o.value === v)?.label ?? String(v));
      return labels.length ? labels.join(", ") : "None";
    }
    case "money":
      return formatCents(typeof raw === "number" ? raw : 0);
    case "int":
      return `${typeof raw === "number" ? raw : 0}${field.unit ? ` ${field.unit}` : ""}`;
    case "bps":
      return formatBps(typeof raw === "number" ? raw : 0);
    case "bool":
      return raw === true ? "Yes" : "No";
    case "date_blocks": {
      const blocks = Array.isArray(raw) ? (raw as DateBlock[]) : [];
      if (!blocks.length) return "No dates yet";
      return blocks
        .map((b) => {
          const kind = field.kinds.find((k) => k.value === b.kind)?.label ?? "Dates";
          const range = b.end_date && b.end_date !== b.start_date ? `${formatDate(b.start_date)} – ${formatDate(b.end_date)}` : formatDate(b.start_date);
          return `${kind}: ${range}${b.location ? ` · ${b.location}` : ""}`;
        })
        .join("\n");
    }
  }
}

/** Read-only module values as a definition list. */
export function ModuleValueSummary({ spec, value }: { spec: ModuleSpec; value: ModuleValue | null }) {
  if (spec.placeholder) {
    return (
      <div className="deal-memo__stack" style={{ gap: 8 }}>
        <p className="deal-memo__sub">{spec.placeholder.text}</p>
        {spec.fields.length && value ? <FieldList spec={spec} value={value} /> : null}
      </div>
    );
  }
  if (!spec.fields.length) return <p className="deal-memo__sub">{spec.description}</p>;
  if (!value) return null;
  return <FieldList spec={spec} value={value} />;
}

function FieldList({ spec, value }: { spec: ModuleSpec; value: ModuleValue }) {
  return (
    <dl className="deal-memo__summary">
      {spec.fields.map((field) => (
        <div key={field.key} style={field.type === "date_blocks" ? { gridColumn: "1 / -1" } : undefined}>
          <dt>{field.label}</dt>
          <dd style={{ whiteSpace: "pre-line" }}>{formatFieldValue(field, value[field.key])}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Field-level before → after for replied or disputed modules. */
export function ModuleDiff({
  spec,
  before,
  after,
  beforeIncluded,
  afterIncluded,
  label = "Changed",
}: {
  spec: ModuleSpec;
  before: ModuleValue | null;
  after: ModuleValue | null;
  beforeIncluded?: boolean | null;
  afterIncluded?: boolean | null;
  label?: string;
}) {
  const rows: { key: string; label: string; from: string; to: string }[] = [];
  if (beforeIncluded != null && afterIncluded != null && beforeIncluded !== afterIncluded) {
    rows.push({ key: "__included", label: "Clause", from: beforeIncluded ? "Included" : "Not included", to: afterIncluded ? "Included" : "Not included" });
  }
  if (before && after) {
    for (const field of spec.fields) {
      const from = formatFieldValue(field, before[field.key]);
      const to = formatFieldValue(field, after[field.key]);
      if (from !== to) rows.push({ key: field.key, label: field.label, from, to });
    }
  }
  if (!rows.length) return null;
  return (
    <div className="deal-memo__diff" role="group" aria-label={`${label}: ${spec.label}`}>
      <strong style={{ fontSize: 12 }}>{label}</strong>
      {rows.map((row) => (
        <p key={row.key} style={{ whiteSpace: "pre-line" }}>
          {row.label}: <del>{row.from}</del> <span aria-hidden="true">→</span>
          <span className="deal-memo__sr-only"> changed to </span> <ins>{row.to}</ins>
        </p>
      ))}
    </div>
  );
}
