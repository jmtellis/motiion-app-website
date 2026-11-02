"use client";

import { useEffect, useState } from "react";

/** A query owns its results. Cancellation never publishes an older response. */
export function useDebouncedSearch<T>(
  query: string,
  enabled: boolean,
  search: (query: string, signal: AbortSignal) => Promise<T>,
  delay: number,
) {
  const [result, setResult] = useState<{ query: string; data?: T; error?: string } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await search(query, controller.signal);
        if (!controller.signal.aborted) setResult({ query, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ query, error: error instanceof Error ? error.message : "Search is unavailable. Try again." });
        }
      }
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, enabled, search, delay]);

  const current = enabled && result?.query === query ? result : null;
  return { data: current?.data, error: current?.error ?? null, loading: enabled && !current };
}
