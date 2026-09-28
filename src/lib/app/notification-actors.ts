"use server";

import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NotificationActor = {
  name: string;
  avatarUrl: string | null;
};

function displayName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  return (
    row.display_name?.trim() ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    ""
  );
}

export async function fetchNotificationActors(
  userIds: string[],
): Promise<Record<string, NotificationActor>> {
  await requireAuth();
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].slice(0, 80);
  if (!ids.length) return {};

  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, headshot_urls")
    .in("user_id", ids);

  const actors: Record<string, NotificationActor> = {};
  for (const row of data ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (!userId) continue;
    actors[userId] = {
      name: displayName(row),
      avatarUrl: getProfileAvatarUrl(row.headshot_urls as string[] | null),
    };
  }
  return actors;
}
