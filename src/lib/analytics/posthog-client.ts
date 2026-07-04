"use client";

import posthog from "posthog-js";

let initialized = false;

/** Lazily boot posthog-js when a key is configured; no-op otherwise. */
export function getPostHog(): typeof posthog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return null;

  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false, // page_viewed is tracked explicitly
      persistence: "localStorage+cookie",
    });
    initialized = true;
  }

  return posthog;
}
