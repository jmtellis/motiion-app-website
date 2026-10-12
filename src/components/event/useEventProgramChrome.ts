"use client";

import { useEffect, useState } from "react";

const POWERED_BY_REVEAL_HEIGHT = 56;

/** Shared program-page chrome: dark document class + fade-in "Powered by" on scroll. */
export function useEventProgramChrome() {
  const [poweredByOpacity, setPoweredByOpacity] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("event-program-page");
    return () => {
      document.documentElement.classList.remove("event-program-page");
    };
  }, []);

  useEffect(() => {
    function updatePoweredByOpacity() {
      const doc = document.documentElement;
      const remaining = Math.max(0, doc.scrollHeight - window.scrollY - window.innerHeight);

      if (doc.scrollHeight - window.innerHeight <= 8) {
        setPoweredByOpacity(1);
        return;
      }

      const opacity = 1 - Math.min(1, remaining / POWERED_BY_REVEAL_HEIGHT);
      setPoweredByOpacity((current) => (Math.abs(current - opacity) > 0.01 ? opacity : current));
    }

    updatePoweredByOpacity();
    window.addEventListener("scroll", updatePoweredByOpacity, { passive: true });
    window.addEventListener("resize", updatePoweredByOpacity);
    return () => {
      window.removeEventListener("scroll", updatePoweredByOpacity);
      window.removeEventListener("resize", updatePoweredByOpacity);
    };
  }, []);

  return poweredByOpacity;
}
