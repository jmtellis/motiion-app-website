"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DraftPersonRef } from "@/lib/talent-buyers/activities/types";

function profileName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const display = row.display_name?.trim();
  if (display) return display;
  const combined = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return row.username?.trim() || "Member";
}

function headshot(urls: string[] | null | undefined): string | null {
  if (!Array.isArray(urls)) return null;
  return urls.find((url) => typeof url === "string" && url.trim())?.trim() ?? null;
}

export async function searchActivityPeople(
  query: string,
): Promise<{ ok: true; people: DraftPersonRef[] } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const q = query.trim();
  if (q.length < 2) return { ok: true, people: [] };

  const safe = q.replace(/[%_,.()]/g, "").slice(0, 64);
  if (safe.length < 2) return { ok: true, people: [] };
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,display_name,first_name,last_name,username,headshot_urls")
    .neq("user_id", user.id)
    .or(
      `display_name.ilike."${pattern}",first_name.ilike."${pattern}",last_name.ilike."${pattern}",username.ilike."${pattern}"`,
    )
    .limit(12);

  if (error) {
    console.error("[activities] people search", error.message);
    return { ok: false, error: "Could not search people." };
  }

  const people = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: String(row.user_id),
    displayName: profileName(
      row as {
        display_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
      },
    ),
    headshotUrl: headshot(row.headshot_urls as string[] | null),
  }));

  return { ok: true, people };
}
