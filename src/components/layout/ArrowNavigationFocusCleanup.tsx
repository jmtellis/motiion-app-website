"use client";

import { useEffect } from "react";

import {
  isArrowNavigationKey,
  isTypingTarget,
  preservesArrowFocus,
  releaseStuckFocusFromArrowNavigation,
} from "@/lib/keyboard";

/**
 * Arrow keys are often used for custom navigation (carousels, grids, etc.).
 * Browsers can leave the previous button/link focused, which shows a persistent outline.
 */
export function ArrowNavigationFocusCleanup() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isArrowNavigationKey(event.key)) return;
      if (isTypingTarget(event.target)) return;
      if (preservesArrowFocus(event.target)) return;

      queueMicrotask(releaseStuckFocusFromArrowNavigation);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
