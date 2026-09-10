"use client";

import { useLayoutEffect } from "react";

import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

/** Keeps html/body background in sync with marketing pages so footer reveal has no paper-colored gaps. */
export function MarketingBodySurface({ dark = false }: { dark?: boolean }) {
  const surface = dark ? MARKETING_DARK.bg : "var(--paper)";

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.backgroundColor = surface;
    body.style.backgroundColor = surface;
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    if (dark) {
      html.style.colorScheme = "dark";
    }

    return () => {
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
      html.style.colorScheme = "";
    };
  }, [surface, dark]);

  // Server + first client paint: keep dark routes from flashing paper white.
  return (
    <style>{`html,body{background-color:${surface};overscroll-behavior:none;}${dark ? "html{color-scheme:dark;}" : ""}`}</style>
  );
}
