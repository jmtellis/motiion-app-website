"use client";

import { useEffect, useMemo, useState } from "react";

import { FEET_RANGE, INCHES_RANGE, formatHeight, parseHeight } from "@/lib/onboarding/height";

export function HeightPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (height: string) => void;
}) {
  const parsed = useMemo(() => parseHeight(value), [value]);
  const [feet, setFeet] = useState(parsed.feet);
  const [inches, setInches] = useState(parsed.inches);

  useEffect(() => {
    setFeet(parsed.feet);
    setInches(parsed.inches);
  }, [parsed.feet, parsed.inches]);

  function update(nextFeet: number, nextInches: number) {
    setFeet(nextFeet);
    setInches(nextInches);
    onChange(formatHeight(nextFeet, nextInches));
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--tone)] p-5">
      <p className="text-center text-3xl font-semibold tracking-tight text-[var(--ink)]">
        {formatHeight(feet, inches)}
      </p>
      <p className="mt-1 text-center text-sm text-[var(--ink-soft)]">Drag to set your height</p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <label className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[var(--ink-soft)]">
            <span>Feet</span>
            <span className="font-semibold text-[var(--ink)]">{feet}</span>
          </div>
          <input
            type="range"
            min={FEET_RANGE[0]}
            max={FEET_RANGE[FEET_RANGE.length - 1]}
            step={1}
            value={feet}
            onChange={(event) => update(Number(event.target.value), inches)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--line)] accent-[var(--ink)]"
          />
        </label>

        <label className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[var(--ink-soft)]">
            <span>Inches</span>
            <span className="font-semibold text-[var(--ink)]">{inches}</span>
          </div>
          <input
            type="range"
            min={INCHES_RANGE[0]}
            max={INCHES_RANGE[INCHES_RANGE.length - 1]}
            step={1}
            value={inches}
            onChange={(event) => update(feet, Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--line)] accent-[var(--ink)]"
          />
        </label>
      </div>
    </div>
  );
}
