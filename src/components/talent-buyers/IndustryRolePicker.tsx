"use client";
import { ApplicationTextInput } from "./ApplicationTextInput";
import { ApplicationMultiPicker } from "./ApplicationMultiPicker";
import { industryRoleOptions } from "@/lib/talent-buyers/industry-application";

export function IndustryRolePicker({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const selected = value.split("; ").filter(Boolean);
  const custom = selected.find(role => !industryRoleOptions.includes(role));
  const other = custom ?? (selected.includes("Other") ? "Other" : undefined);
  function toggle(role: string) {
    const next = role === "Other" && other ? selected.filter(item => item !== other) : selected.includes(role) ? selected.filter(item => item !== role) : [...selected, role];
    onChange(next.join("; "));
  }
  return <div className="industry-role-picker signup-split-field">
    <ApplicationMultiPicker label="Professional roles" placeholder="Select your roles" searchPlaceholder="Search for a role" help="Select all the roles that describe your work." options={industryRoleOptions} selected={selected.map(role => role === other ? "Other" : role)} disabled={disabled} onToggle={toggle} />
    {other && <label className="signup-split-field"><span>Your other role</span><ApplicationTextInput onClear={() => onChange(selected.map(item => item === other ? "Other" : item).join("; "))} required aria-label="Your other role" disabled={disabled} maxLength={Math.max(1, 200 - selected.filter(item => item !== other).join("; ").length - 2)} value={other === "Other" ? "" : other} onChange={event => onChange(selected.map(item => item === other ? event.target.value.replace(/;/g, "").trimStart() || "Other" : item).join("; "))} /></label>}
  </div>;
}
