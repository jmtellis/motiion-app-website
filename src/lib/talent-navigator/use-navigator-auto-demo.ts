"use client";

import { useEffect, useRef } from "react";

import type { NavigatorDirection } from "@/lib/talent-navigator/use-navigator-slide";

type UseNavigatorAutoDemoOptions = {
  enabled: boolean;
  path: NavigatorDirection[];
  navigate: (direction: NavigatorDirection) => void;
  isSlidingRef: React.RefObject<boolean>;
  initialDelayMs?: number;
  intervalMs?: number;
};

export function useNavigatorAutoDemo({
  enabled,
  path,
  navigate,
  isSlidingRef,
  initialDelayMs = 1400,
  intervalMs = 1500,
}: UseNavigatorAutoDemoOptions) {
  const pathIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled || path.length === 0) return;

    pathIndexRef.current = 0;
    let intervalId = 0;

    const tick = () => {
      if (isSlidingRef.current) return;
      navigate(path[pathIndexRef.current % path.length]);
      pathIndexRef.current += 1;
    };

    const initial = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, intervalMs);
    }, initialDelayMs);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(intervalId);
    };
  }, [enabled, initialDelayMs, intervalMs, isSlidingRef, navigate, path]);
}
