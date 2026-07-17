import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

/**
 * Soft-close a casting: remove from open listings and stop new submissions
 * (including via invite links) without clearing Final Selects / finalize flags.
 */
export async function closePublishedCasting(
  supabase: SupabaseClient,
  castingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();

  const { error: statusError } = await supabase
    .from("castings")
    .update({ status: "closed", updated_at: now })
    .eq("id", castingId);

  if (statusError) return { ok: false, error: statusError.message };

  const { error: rolesError } = await supabase
    .from("roles")
    .update({ is_active: false, updated_at: now })
    .eq("casting_id", castingId);

  if (rolesError) return { ok: false, error: rolesError.message };

  const { error: castingRolesError } = await supabase
    .from("casting_roles")
    .update({ status: "closed" })
    .eq("casting_id", castingId);

  // Non-fatal: listing/submit gates use castings.status + roles.is_active.
  if (castingRolesError) {
    console.warn("closePublishedCasting: casting_roles status update failed", castingRolesError.message);
  }

  return { ok: true };
}
