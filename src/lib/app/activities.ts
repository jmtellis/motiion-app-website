"use server";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SessionJoinResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
};

export type RequestSessionJoinResult =
  | { ok: true; status: string }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "error"; error: string };

/** RSVP to a session via the shared iOS `request_session_join` RPC. */
export async function requestSessionJoin(activityId: string): Promise<RequestSessionJoinResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, reason: "error", error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data, error } = await supabase.rpc("request_session_join", {
    p_activity_id: activityId,
  });

  if (error) {
    return { ok: false, reason: "error", error: error.message };
  }

  const response = (data ?? {}) as SessionJoinResponse;
  if (response.error) {
    return { ok: false, reason: "error", error: response.message ?? response.error };
  }

  await trackServerEvent("rsvp_submitted", {
    activity_id: activityId,
    activity_type: "session",
    status: response.status ?? "requested",
  });

  return { ok: true, status: response.status ?? "requested" };
}
