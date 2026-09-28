"use client";
import { formatHeight, parseHeight } from "@/lib/onboarding/height";

export function HeightPicker({ value, onChange }: { value: string; onChange: (height: string) => void }) {
  const { feet, inches } = parseHeight(value);
  const total = feet * 12 + inches;
  return <div className="space-y-7 rounded-3xl bg-[var(--tone)] p-6">
    <div className="text-center">
      <p className="text-3xl font-semibold tracking-tight">{formatHeight(feet, inches)}</p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{Math.round(total * 2.54)} cm · Drag to set your height</p>
    </div>
    <input type="range" aria-label="Height" aria-valuetext={`${feet} feet ${inches} inches`} min={36} max={95} step={1} value={total}
      onChange={event => { const next = Number(event.target.value); onChange(formatHeight(Math.floor(next / 12), next % 12)); }}
      className="h-2 w-full cursor-pointer accent-[var(--ink)]" />
    <div className="flex justify-between text-xs text-[var(--ink-soft)]"><span>3′ 0″</span><span>7′ 11″</span></div>
    {!value && <button type="button" className="signup-split-text-btn w-full" onClick={() => onChange(formatHeight(feet, inches))}>Use {formatHeight(feet, inches)}</button>}
  </div>;
}
