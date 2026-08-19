"use client";

import { useEffect } from "react";

/** Pins mobile browser chrome (Safari/Chrome URL bar) to one color instead of sampling scroll content. */
export function BrowserThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const ensureMeta = (name: string, content: string, media?: string) => {
      const selector = media
        ? `meta[name="${name}"][media="${media}"]`
        : `meta[name="${name}"]:not([media])`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        if (media) meta.setAttribute("media", media);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    ensureMeta("theme-color", color);
    ensureMeta("theme-color", color, "(prefers-color-scheme: light)");
    ensureMeta("theme-color", color, "(prefers-color-scheme: dark)");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    document.documentElement.style.colorScheme = color === "#fcfcfb" ? "light" : "dark";
  }, [color]);

  return null;
}
