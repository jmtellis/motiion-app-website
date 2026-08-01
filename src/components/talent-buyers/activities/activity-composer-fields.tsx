"use client";

import type { ReactNode } from "react";

import {
  LocationAutocomplete,
  type SelectedPlace,
} from "@/components/talent-buyers/project/LocationAutocomplete";
import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";

export const activityFieldClass = "project-create__input";

const activityTextAreaClass = "project-create__textarea";

export function ActivityField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="project-create__field">
      <span className="project-create__label">{label}</span>
      <div className="activity-composer-field">{children}</div>
    </div>
  );
}

export function ActivityTextInput(props: React.ComponentProps<"input">) {
  const { className, ...rest } = props;
  return <input {...rest} className={`${activityFieldClass}${className ? ` ${className}` : ""}`} />;
}

export function ActivityTextArea(props: React.ComponentProps<"textarea">) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`${activityTextAreaClass}${className ? ` ${className}` : ""}`} />;
}

export function ActivityLocationField({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (next: ActivityDraft) => void;
}) {
  return (
    <LocationAutocomplete
      label="Venue"
      mode="establishments"
      value={draft.locationLabel}
      placeholder="Search for a studio or venue"
      onChange={(value) => onChange({ ...draft, locationLabel: value, place: null })}
      onPlaceSelect={(place: SelectedPlace) =>
        onChange({
          ...draft,
          locationLabel: place.displayLabel,
          place: {
            placeId: place.placeId,
            name: place.name,
            formattedAddress: place.formattedAddress,
            displayLabel: place.displayLabel,
          },
        })
      }
    />
  );
}

export function StringListEditor({
  label,
  values,
  placeholder,
  max = 5,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  max?: number;
  onChange: (values: string[]) => void;
}) {
  return (
    <ActivityField label={label}>
      <div className="flex flex-col gap-2">
        {values.map((value, index) => (
          <div key={`${index}-${placeholder}`} className="flex gap-2">
            <ActivityTextInput
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...values];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              className="project-create__btn project-create__btn--secondary shrink-0"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        {values.length < max ? (
          <button
            type="button"
            className="project-create__btn project-create__btn--secondary"
            onClick={() => onChange([...values, ""])}
          >
            Add
          </button>
        ) : null}
      </div>
    </ActivityField>
  );
}

export function PillSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ActivityField label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`casting-wizard-pill${selected ? " casting-wizard-pill--selected" : ""}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </ActivityField>
  );
}

export function PillMultiSelect({
  label,
  options,
  values,
  max = 5,
  onChange,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  max?: number;
  onChange: (values: string[]) => void;
}) {
  const selected = new Set(values);

  return (
    <ActivityField label={label}>
      <p className="project-create__section-copy mb-2">
        Select up to {max}
        {values.length ? ` · ${values.length} selected` : ""}
      </p>
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onChange(values.filter((v) => v !== option));
                  return;
                }
                if (values.length >= max) return;
                onChange([...values, option]);
              }}
              className={`casting-wizard-pill${isSelected ? " casting-wizard-pill--selected" : ""}`}
              disabled={!isSelected && values.length >= max}
            >
              {option}
            </button>
          );
        })}
      </div>
    </ActivityField>
  );
}
