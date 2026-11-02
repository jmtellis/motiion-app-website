import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CastingCandidateSource, CastingCandidateStatus } from "./casting-types";

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type Input = {
  casting_id: string;
  project_id: string;
  talent_profile_id: string;
  role_ids: string[];
  source: CastingCandidateSource;
  status: CastingCandidateStatus;
  display_name: string;
  created_by: string | null;
  invitation_id?: string;
  headshot_url?: string | null;
};

export function mergeDiscoveredCandidateSave(input: Input, existing: {
  status: string; source: string; created_by: string | null; display_name: string | null; role_ids: string[] | null;
}) {
  return {
    ...input,
    status: existing.status,
    source: existing.source,
    created_by: existing.created_by,
    display_name: existing.display_name || input.display_name,
    role_ids: [...new Set([...(existing.role_ids ?? []), ...input.role_ids])],
  };
}

/** Partial unique indexes cannot be used as PostgREST upsert conflict targets.
 * Resolve the owner-scoped row, then update by primary ID; a unique-race retry
 * resolves the winner without duplicating or resetting a progressed candidate.
 */
export async function saveDiscoveredCastingCandidate(client: Client, input: Input) {
  const find = () => client.from("casting_candidates")
    .select("id,status,source,role_ids,display_name,created_by,updated_at")
    .eq("project_id", input.project_id).eq("casting_id", input.casting_id)
    .eq("talent_profile_id", input.talent_profile_id).maybeSingle();
  let current = await find();
  if (current.error) return { ok: false as const, error: "Could not check the saved candidate. Please retry." };
  if (!current.data) {
    const inserted = await client.from("casting_candidates").insert(input).select("id").single();
    if (!inserted.error) return { ok: true as const, id: inserted.data.id as string };
    if (inserted.error.code !== "23505") return { ok: false as const, error: inserted.error.message };
    current = await find();
    if (current.error || !current.data) return { ok: false as const, error: "This candidate changed while saving. Please refresh and retry." };
  }
  const existing = current.data;
  const update = client.from("casting_candidates").update({
    ...mergeDiscoveredCandidateSave(input, existing),
    updated_at: new Date().toISOString(),
  }).eq("id", existing.id).eq("project_id", input.project_id);
  const result = await (existing.updated_at ? update.eq("updated_at", existing.updated_at) : update.is("updated_at", null)).select("id").maybeSingle();
  return result.error || !result.data
    ? { ok: false as const, error: "This candidate changed while saving. Please refresh and retry." }
    : { ok: true as const, id: result.data.id as string };
}
