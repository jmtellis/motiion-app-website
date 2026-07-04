import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AnalyticsEventInsert } from "./types";

export async function trackServerEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  path?: string | null,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: AnalyticsEventInsert = {
    user_id: user?.id ?? null,
    session_id: null,
    platform: "web",
    event_name: eventName,
    properties,
    path: path ?? null,
  };

  const { error } = await supabase.from("analytics_events").insert(payload);
  if (error) {
    console.debug("analytics server track failed:", error.message);
  }
}
