"use client";

import { createClientSupabaseClient } from "@/lib/supabase/client";

import { getPostHog } from "./posthog-client";
import { getAnalyticsSessionId } from "./session";
import type { AnalyticsEventInsert } from "./types";

function getCurrentPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname;
}

export function trackClientEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  path?: string | null,
): void {
  getPostHog()?.capture(eventName, { ...properties, path: path ?? getCurrentPath() });

  void (async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: AnalyticsEventInsert = {
      user_id: user?.id ?? null,
      session_id: getAnalyticsSessionId() || null,
      platform: "web",
      event_name: eventName,
      properties,
      path: path ?? getCurrentPath(),
    };

    const { error } = await supabase.from("analytics_events").insert(payload);
    if (error) {
      console.debug("analytics track failed:", error.message);
    }
  })();
}
