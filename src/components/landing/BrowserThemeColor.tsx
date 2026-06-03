"use client";

import { useEffect } from "react";

/** Pins mobile browser chrome (Safari/Chrome URL bar) to one color instead of sampling scroll content. */
export function BrowserThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    ensureMeta("theme-color", color);
    document.documentElement.style.colorScheme = color === "#fcfcfb" ? "light" : "dark";
  }, [color]);

  return null;
}
