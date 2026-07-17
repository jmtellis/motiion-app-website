"use client";

import type { ReactNode } from "react";

import { AuthField, AuthInput, AuthTextArea } from "@/components/auth/ui";
import {
  LocationAutocomplete,
  type SelectedPlace,
} from "@/components/talent-buyers/project/LocationAutocomplete";
import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";

export const activityFieldClass =
  "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#2dd4bf]/50";

export function ActivityField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <AuthField label={label}>
      <div className="activity-composer-field">{children}</div>
    </AuthField>
  );
}

export function ActivityTextInput(props: React.ComponentProps<typeof AuthInput>) {
  return <AuthInput {...props} className={`${activityFieldClass} ${props.className ?? ""}`} />;
}

export function ActivityTextArea(props: React.ComponentProps<typeof AuthTextArea>) {
  return <AuthTextArea {...props} className={`${activityFieldClass} ${props.className ?? ""}`} />;
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
      <div className="space-y-2">
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
              className="bd-btn-secondary shrink-0"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        {values.length < max ? (
          <button
            type="button"
            className="bd-btn-secondary"
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
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected
                  ? "border-[#2dd4bf]/45 bg-[#2dd4bf]/12 text-[#2dd4bf]"
                  : "border-white/12 text-white/60 hover:text-white"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </ActivityField>
  );
}
