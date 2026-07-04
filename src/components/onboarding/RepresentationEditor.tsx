"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronRight, Plus, X } from "lucide-react";

import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";

const MAX_ADDITIONAL = 2;

function AgencySelector({
  label,
  value,
  agencies,
  placeholder,
  onChange,
}: {
  label?: string;
  value: string;
  agencies: TalentAgency[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return agencies;
    return agencies.filter((agency) => agency.name.toLowerCase().includes(query));
  }, [agencies, search]);

  return (
    <div ref={containerRef} className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-[var(--radius-field)] border border-[var(--line)] bg-white px-4 py-3 text-left"
      >
        <Building2 className="size-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-sm ${value ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
          {value || placeholder}
        </span>
        <ChevronRight className="size-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
      </button>

      {open ? (
        <div className="overflow-hidden ui-card shadow-[var(--shadow-raised)]">
          <div className="border-b border-[var(--line)] p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agencies"
              className="w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--tone)] px-4 py-2 text-sm text-[var(--ink)] outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((agency) => (
              <button
                key={agency.id}
                type="button"
                onClick={() => {
                  onChange(agency.name);
                  setSearch(agency.name);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--tone)]"
              >
                {agency.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agency.logo_url} alt="" className="size-10 rounded-md object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-md bg-[var(--tone)] text-[var(--ink-soft)]">
                    <Building2 className="size-4" aria-hidden />
                  </div>
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--ink)]">{agency.name}</span>
                  {agency.location ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--ink-soft)]">{agency.location}</span>
                  ) : null}
                </span>
              </button>
            ))}
            {!filtered.length ? (
              <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">No agencies match that search.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RepresentationEditor({
  representation,
  agent,
  additionalRepresentations,
  agencies,
  onChange,
}: {
  representation: string;
  agent: string;
  additionalRepresentations: string[];
  agencies: TalentAgency[];
  onChange: (patch: {
    representation: string;
    agent: string;
    additionalRepresentations: string[];
  }) => void;
}) {
  const primary = representation || agent;
  const additional = additionalRepresentations;

  function setPrimary(value: string) {
    onChange({
      representation: value,
      agent: value,
      additionalRepresentations: additional,
    });
  }

  function setAdditional(index: number, value: string) {
    const next = [...additional];
    if (index < next.length) {
      next[index] = value;
    } else {
      next.push(value);
    }
    onChange({
      representation: primary,
      agent: primary,
      additionalRepresentations: next.map((item) => item.trim()).filter(Boolean).slice(0, MAX_ADDITIONAL),
    });
  }

  function removeAdditional(index: number) {
    onChange({
      representation: primary,
      agent: primary,
      additionalRepresentations: additional.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--ink-soft)]">
        If you are represented by a talent agency, add them below.
      </p>

      <AgencySelector
        label="Primary agency"
        value={primary}
        agencies={agencies}
        placeholder="Select agency"
        onChange={setPrimary}
      />

      <div className="space-y-3 border-t border-[var(--line)] pt-5">
        {additional.map((agencyName, index) => (
          <div key={`${index}-${agencyName}`} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <AgencySelector
                label={`Additional agency ${index + 1}`}
                value={agencyName}
                agencies={agencies}
                placeholder="Select agency"
                onChange={(value) => setAdditional(index, value)}
              />
            </div>
            <button
              type="button"
              aria-label="Remove agency"
              onClick={() => removeAdditional(index)}
              className="mt-7 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--tone)] hover:text-[var(--ink)]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}

        {additional.filter((item) => item.trim()).length < MAX_ADDITIONAL ? (
          <button
            type="button"
            onClick={() => {
              onChange({
                representation: primary,
                agent: primary,
                additionalRepresentations: [...additional, ""],
              });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            <Plus className="size-4" aria-hidden />
            Add agency
          </button>
        ) : null}
      </div>
    </div>
  );
}
