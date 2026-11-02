import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { isAccountAuthoredSubmission } from "./submission-origin";

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

/** Saved/added people are not consent to disclose a private profile. Use the
 * shared guarded card contract, and current-client submission RLS plus captured
 * account-authored provenance for contact. Requires preserve_submission_identity.
 * The service client resolves identifiers only until permission is established.
 */
export async function resolveTalentProfileAccess(client: Client, userIds: string[]) {
  const allowed = new Set<string>();
  const contact = new Set<string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return { allowed, contact };
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Sign in again to load these profiles.");
  const viewer = auth.data.user.id;
  if (ids.includes(viewer)) { allowed.add(viewer); contact.add(viewer); }
  const reader = createAdminSupabaseClient() ?? client;
  for (let start = 0; start < ids.length; start += 200) {
    const batch = ids.slice(start, start + 200);
    const [profiles, submissions] = await Promise.all([
      reader.from("professional_profiles").select("id,user_id").in("user_id", batch),
      readPagedRows((from, to) => client.from("submissions").select("id,talent_id,submitted_by")
        .in("talent_id", batch).order("id").range(from, to)),
    ]);
    if (profiles.error || submissions.error) throw new Error("Could not check profile access. Please retry.");
    const profileIds = (profiles.data ?? []).map((profile) => profile.id);
    if (profileIds.length) {
      const cards = await client.rpc("hydrate_library_member_cards", { p_profile_ids: profileIds });
      if (cards.error) throw new Error("Could not check profile visibility. Please retry.");
      for (const card of (cards.data ?? []) as { user_id: string }[]) allowed.add(card.user_id);
    }
    for (const submission of submissions.data ?? []) if (submission.talent_id && isAccountAuthoredSubmission(submission)) contact.add(submission.talent_id);
  }
  return { allowed, contact };
}
