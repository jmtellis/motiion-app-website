import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import type { TalentBuyerVerificationLinks } from "@/types/talent-buyers";

export type BuyerOrganizationInfo = { id: string; name: string; website: string | null; type: string | null };
export type BuyerTeamMember = { userId: string; name: string; email: string | null; role: string };

// Request-scoped caches deduplicate the profile / organization reads without
// retaining another account's settings across requests.
const readBuyer = cache(async (userId: string) => {
  const db = await createServerSupabaseClient();
  if (!db) throw new Error("Settings are temporarily unavailable.");
  const { data, error } = await db.from("non_talent_profiles")
    .select("organization_id, organization_name, organization_website, verification_links")
    .eq("id", userId).single();
  if (error) throw new Error("Couldn’t load workspace settings. Please try again.");
  return data;
});

export const fetchBuyerOrganization = cache(async (userId: string): Promise<BuyerOrganizationInfo | null> => {
  const buyer = await readBuyer(userId);
  if (buyer.organization_id) {
    const db = await createServerSupabaseClient();
    const result = await db!.from("organizations").select("id,name,website,type").eq("id", buyer.organization_id).maybeSingle();
    if (result.error) throw new Error("Couldn’t load your organization. Please try again.");
    if (result.data) return { id: result.data.id, name: result.data.name || buyer.organization_name || "Organization", website: result.data.website || buyer.organization_website || null, type: result.data.type };
  }
  return buyer.organization_name ? { id: "profile-org", name: buyer.organization_name, website: buyer.organization_website ?? null, type: null } : null;
});

export async function fetchBuyerTeamMembers(userId: string): Promise<BuyerTeamMember[]> {
  const org = await fetchBuyerOrganization(userId);
  if (!org || org.id === "profile-org") return [];
  const db = await createServerSupabaseClient();
  if (!db) throw new Error("Couldn’t load your team. Please try again.");
  const teams = await readPagedRows<{ id: string }>((from, to) => db.from("teams").select("id").eq("organization_id", org.id).order("id").range(from, to));
  if (teams.error) throw new Error("Couldn’t load your team. Please try again.");
  const teamIds = (teams.data ?? []).map(team => team.id);
  if (!teamIds.length) return [];
  type Member = { user_id: string; role: string | null; profiles: { display_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null };
  const unique = new Map<string, BuyerTeamMember>();
  for (let offset = 0; offset < teamIds.length; offset += 100) {
    const result = await readPagedRows<Member>((from, to) => db.from("team_members")
      .select("user_id,role,profiles(display_name,first_name,last_name,email)")
      .in("team_id", teamIds.slice(offset, offset + 100)).order("user_id").order("team_id").range(from, to) as unknown as PromiseLike<{ data: Member[] | null; error: { message: string } | null }>);
    if (result.error) throw new Error("Couldn’t load all team members. Please try again.");
    for (const member of result.data ?? []) {
      if (unique.has(member.user_id)) continue;
      const profile = member.profiles;
      unique.set(member.user_id, { userId: member.user_id, name: profile?.display_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || "Team member", email: profile?.email ?? null, role: member.role ?? "member" });
    }
  }
  return [...unique.values()];
}

export async function fetchBuyerSettingsExtras(userId: string) {
  try {
    const [profile, organization, teamMembers] = await Promise.all([readBuyer(userId), fetchBuyerOrganization(userId), fetchBuyerTeamMembers(userId)]);
    return { organization, teamMembers, verificationLinks: profile.verification_links as TalentBuyerVerificationLinks | null, error: null };
  } catch (error) {
    return { organization: null, teamMembers: [], verificationLinks: null, error: error instanceof Error ? error.message : "Couldn’t load workspace settings. Please try again." };
  }
}
