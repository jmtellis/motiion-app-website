"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import "./chips.css";

export type ChipOption = string | { value: string; label: string };

function optionValue(option: ChipOption) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: ChipOption) {
  return typeof option === "string" ? option : option.label;
}

type ChipGroupBase = {
  options: readonly ChipOption[];
  ariaLabel: string;
  /** Options shown before "+N more". Selected options always stay visible. */
  collapsedCount?: number;
  /** Adds a leading "Any" chip that clears the selection. */
  includeAny?: boolean;
  anyLabel?: string;
  className?: string;
};

type ChipGroupProps =
  | (ChipGroupBase & { multiple: true; value: string[]; onChange: (value: string[]) => void; max?: number })
  | (ChipGroupBase & { multiple?: false; value: string; onChange: (value: string) => void; max?: never });

const SEARCH_THRESHOLD = 16;

/**
 * The one chip input: single or multi-select with progressive disclosure, so long
 * catalogs (styles, skills) start short and expand in place.
 */
export function ChipGroup(props: ChipGroupProps) {
  const { options, ariaLabel, collapsedCount = 10, includeAny = false, anyLabel = "Any", className = "" } = props;
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const selected = useMemo(
    () => new Set(props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );
  const collapsible = options.length > collapsedCount + 2;
  const normalized = query.trim().toLowerCase();

  const leading = collapsible ? options.slice(0, collapsedCount) : options;
  const rest = collapsible ? options.slice(collapsedCount) : [];
  const pinned = rest.filter((option) => selected.has(optionValue(option)));
  const hidden = rest.filter((option) => !selected.has(optionValue(option)));
  const visibleHidden = normalized
    ? hidden.filter((option) => optionLabel(option).toLowerCase().includes(normalized))
    : hidden;
  const atMax = props.multiple && props.max !== undefined && props.value.length >= props.max;

  function toggle(value: string) {
    if (props.multiple) {
      if (selected.has(value)) props.onChange(props.value.filter((item) => item !== value));
      else if (!atMax) props.onChange([...props.value, value]);
      return;
    }
    props.onChange(value);
  }

  function clear() {
    if (props.multiple) props.onChange([]);
    else props.onChange("");
  }

  function chip(option: ChipOption) {
    const value = optionValue(option);
    const on = selected.has(value);
    return (
      <button
        key={value}
        type="button"
        className="ui-chip"
        aria-pressed={on}
        disabled={!on && atMax}
        onClick={() => toggle(value)}
      >
        {optionLabel(option)}
      </button>
    );
  }

  return (
    <div className={`ui-chip-group ${className}`.trim()} role="group" aria-label={ariaLabel}>
      <div className="ui-chip-group__row">
        {includeAny ? (
          <button type="button" className="ui-chip" aria-pressed={selected.size === 0} onClick={clear}>
            {anyLabel}
          </button>
        ) : null}
        {leading.map(chip)}
        {pinned.map(chip)}
        {collapsible ? (
          <button
            type="button"
            className="ui-chip ui-chip--more"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => {
              setExpanded((open) => !open);
              setQuery("");
            }}
          >
            {expanded ? "Show less" : `+${hidden.length} more`}
          </button>
        ) : null}
      </div>
      {collapsible ? (
        <div id={listId} className="ui-chip-group__more" data-open={expanded} inert={!expanded}>
          <div>
            {hidden.length > SEARCH_THRESHOLD ? (
              <label className="ui-chip-group__search">
                <Search size={14} aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${ariaLabel.toLowerCase()}`}
                  aria-label={`Search ${ariaLabel.toLowerCase()}`}
                  className="workspace-bare-input"
                />
                {query ? (
                  <button type="button" className="ui-chip-group__clear" aria-label="Clear search" onClick={() => setQuery("")}>
                    <X size={13} aria-hidden />
                  </button>
                ) : null}
              </label>
            ) : null}
            <div className="ui-chip-group__row">
              {visibleHidden.map(chip)}
              {normalized && visibleHidden.length === 0 ? (
                <p className="ui-chip-group__empty">No matches for “{query.trim()}”.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
