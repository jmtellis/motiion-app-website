"use client";

import { useEffect, useRef } from "react";

/** Reveal the selected route inside its horizontal tab strip without scrolling
 * any parent page/panel or moving keyboard focus. */
export function useVisibleActiveTab<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const reveal = () => {
      const active = container.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
      if (!active) return;
      const outer = container.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.left < outer.left + 8 || item.right > outer.right - 8) {
        container.scrollLeft += item.left - outer.left - (outer.width - item.width) / 2;
      }
    };
    const frame = requestAnimationFrame(reveal);
    const observer = new ResizeObserver(reveal);
    observer.observe(container);
    const active = container.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
    if (active) observer.observe(active);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [activeKey]);
  return ref;
}
