"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TalentBuyerNotificationPreferences, TalentBuyerVerificationLinks } from "@/types/talent-buyers";

export type BuyerOrganizationInfo = {
  id: string;
  name: string;
  website: string | null;
  type: string | null;
};

export type BuyerTeamMember = {
  userId: string;
  name: string;
  email: string | null;
  role: string;
};

export async function fetchBuyerOrganization(userId: string): Promise<BuyerOrganizationInfo | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: buyerProfile } = await supabase
    .from("non_talent_profiles")
    .select("organization_id, organization_name, organization_website")
    .eq("id", userId)
    .maybeSingle();

  if (buyerProfile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, website, type")
      .eq("id", buyerProfile.organization_id)
      .maybeSingle();

    if (org) {
      return {
        id: org.id,
        name: org.name ?? buyerProfile.organization_name ?? "Organization",
        website: org.website ?? buyerProfile.organization_website ?? null,
        type: org.type ?? null,
      };
    }
  }

  if (buyerProfile?.organization_name) {
    return {
      id: "profile-org",
      name: buyerProfile.organization_name,
      website: buyerProfile.organization_website ?? null,
      type: null,
    };
  }

  return null;
}

export async function fetchBuyerTeamMembers(userId: string): Promise<BuyerTeamMember[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const org = await fetchBuyerOrganization(userId);
  if (!org || org.id === "profile-org") return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("organization_id", org.id);

  const teamIds = (teams ?? []).map((team) => team.id as string);
  if (!teamIds.length) return [];

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(display_name, first_name, last_name, email)")
    .in("team_id", teamIds);

  return (members ?? []).map((member) => {
    const profile = member.profiles as {
      display_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    } | null;
    const name =
      profile?.display_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      "Team member";

    return {
      userId: member.user_id as string,
      name,
      email: profile?.email ?? null,
      role: (member.role as string) ?? "member",
    };
  });
}

export async function fetchBuyerSettingsExtras(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      organization: null,
      teamMembers: [],
      notificationPreferences: null as TalentBuyerNotificationPreferences | null,
      verificationLinks: null as TalentBuyerVerificationLinks | null,
    };
  }

  const [{ organization, teamMembers }, { data: buyerProfile }] = await Promise.all([
    Promise.all([fetchBuyerOrganization(userId), fetchBuyerTeamMembers(userId)]).then(
      ([organization, teamMembers]) => ({ organization, teamMembers }),
    ),
    supabase
      .from("non_talent_profiles")
      .select("notification_preferences, verification_links")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  return {
    organization,
    teamMembers,
    notificationPreferences:
      (buyerProfile?.notification_preferences as TalentBuyerNotificationPreferences | null) ?? null,
    verificationLinks: (buyerProfile?.verification_links as TalentBuyerVerificationLinks | null) ?? null,
  };
}
