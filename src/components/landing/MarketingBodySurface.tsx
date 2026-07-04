"use client";

import { useEffect } from "react";

/** Keeps html/body background in sync with marketing pages so footer reveal has no paper-colored gaps. */
export function MarketingBodySurface({ dark = false }: { dark?: boolean }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const surface = dark ? "#000000" : "var(--paper)";

    html.style.backgroundColor = surface;
    body.style.backgroundColor = surface;

    return () => {
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
    };
  }, [dark]);

  return null;
}
