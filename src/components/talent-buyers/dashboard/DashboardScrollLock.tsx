"use client";

import { useEffect } from "react";

/** Locks document scroll so only the dashboard main panel scrolls (prevents page rubber-banding). */
export function DashboardScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlBackground: html.style.backgroundColor,
      bodyBackground: body.style.backgroundColor,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    };

    html.style.backgroundColor = "#0a0a0a";
    body.style.backgroundColor = "#0a0a0a";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";

    return () => {
      html.style.backgroundColor = previous.htmlBackground;
      body.style.backgroundColor = previous.bodyBackground;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      html.style.height = previous.htmlHeight;
      body.style.height = previous.bodyHeight;
    };
  }, []);

  return null;
}
