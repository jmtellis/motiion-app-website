"use client";

import { useId, type ReactNode } from "react";

export function ProfileSectionTabs({ items, value, onChange, children }: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return <div className="profile-section-tabs">
    <div role="tablist" aria-label="Profile sections" className="profile-section-tabs__nav">
      {items.map((item, index) => <button key={item.id} type="button" role="tab"
        id={`${id}-${item.id}`} aria-controls={`${id}-panel`} aria-selected={value === item.id}
        tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}
        onKeyDown={(event) => {
          const delta = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
          if (!delta && !["Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + delta + items.length) % items.length];
          onChange(next.id); document.getElementById(`${id}-${next.id}`)?.focus();
        }}>{item.label}</button>)}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${value}`} className="min-w-0" tabIndex={0}>{children}</div>
  </div>;
}
