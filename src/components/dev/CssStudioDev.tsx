"use client";

import { useEffect } from "react";

/** Dev-only CSS Studio GUI — never loaded in production builds. */
export function CssStudioDev() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    void import("cssstudio").then(({ startStudio }) => {
      startStudio();
    });
  }, []);

  return null;
}
