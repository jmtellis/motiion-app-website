"use client";

import { useEffect } from "react";

/** Keeps html/body background in sync with marketing pages so footer reveal has no paper-colored gaps. */
export function MarketingBodySurface({ dark = false }: { dark?: boolean }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const surface = dark ? "#0a0a0a" : "var(--paper)";

    html.style.backgroundColor = surface;
    body.style.backgroundColor = surface;
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, [dark]);

  return null;
}
