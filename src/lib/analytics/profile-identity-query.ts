import { identityFromProfile, type ProfileIdentitySource } from "@/lib/analytics/person-identity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const PROFILE_COLUMNS =
  "user_id, display_name, first_name, last_name, email, username, headshot_urls";

export type LoadedProfileIdentity = ReturnType<typeof identityFromProfile> & {
  userId: string;
};

async function selectChunk(userIds: string[]) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { data: [] as ProfileIdentitySource[], error: "Supabase admin client is not configured." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("user_id", userIds);

  if (error) {
    return { data: [] as ProfileIdentitySource[], error: error.message };
  }

  return { data: (data ?? []) as ProfileIdentitySource[], error: null as string | null };
}

export async function fetchProfileIdentities(userIds: string[]): Promise<{
  byUserId: Map<string, LoadedProfileIdentity>;
  error: string | null;
}> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const byUserId = new Map<string, LoadedProfileIdentity>();
  if (unique.length === 0) {
    return { byUserId, error: null };
  }

  for (let index = 0; index < unique.length; index += 150) {
    const chunk = unique.slice(index, index + 150);
    const result = await selectChunk(chunk);
    if (result.error) {
      return { byUserId, error: result.error };
    }
    for (const row of result.data) {
      if (!row.user_id) continue;
      const identity = identityFromProfile(row);
      byUserId.set(row.user_id, { ...identity, userId: row.user_id });
    }
  }

  return { byUserId, error: null };
}
