"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { NavigatorDirection } from "./use-navigator-slide";

// A gentle serpentine route: two people, next row, two people back, next row.
const PATTERN: NavigatorDirection[] = ["col-right", "col-right", "row-down", "col-left", "col-left", "row-down"];

export function useDiscoverIdle(root: RefObject<HTMLDivElement | null>, enabled: boolean, navigate: (direction: NavigatorDirection) => void) {
  const nextMove = useRef(navigate);
  useEffect(() => { nextMove.current = navigate; }, [navigate]);

  useEffect(() => {
    if (!enabled) return;
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastActivity = Date.now();
    let step = 0;
    const reset = () => { lastActivity = Date.now(); };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "focusin"] as const;
    for (const event of events) window.addEventListener(event, reset, { passive: true });
    document.addEventListener("visibilitychange", reset);
    reduced.addEventListener("change", reset);
    const timer = window.setInterval(() => {
      const interacting = node.contains(document.activeElement) || node.querySelector(".talent-navigator__card:hover, [role='search']:hover") || document.querySelector("dialog[open], [role='dialog'], .workspace-side-frame[data-open='true']");
      if (document.hidden || reduced.matches || interacting) { reset(); return; }
      if (Date.now() - lastActivity < 12000) return;
      nextMove.current(PATTERN[step++ % PATTERN.length]);
      lastActivity = Date.now() - 4000; // Subsequent steps every eight seconds.
    }, 1000);
    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, reset);
      document.removeEventListener("visibilitychange", reset);
      reduced.removeEventListener("change", reset);
    };
  }, [root, enabled]);
}
