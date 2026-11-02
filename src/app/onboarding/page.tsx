import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { getActiveShell, hasEnabledShell, isCommunityAccount, isOnboardingComplete } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ addShell?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAuth();
  const addingTalent = params.addShell === "talent";

  if (addingTalent) {
    const canAdd =
      isOnboardingComplete(profile) &&
      getActiveShell(profile) === "lookingForTalent" &&
      !hasEnabledShell(profile, "talent") &&
      !isCommunityAccount(profile.accountType);
    if (!canAdd) redirect(getProfileDestination(profile));
    const agencies = await fetchTalentAgencies();
    return <OnboardingFlow profile={profile} agencies={agencies} addingTalentShell />;
  }

  if (isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  if (getActiveShell(profile) === "lookingForTalent") {
    redirect("/talent-buyers/onboarding");
  }

  const db = await createServerSupabaseClient();
  const [agencies, essentials] = await Promise.all([
    fetchTalentAgencies(),
    db?.from("profiles").select("date_of_birth,username,headshot_urls,headshot_original_urls,display_name,acquisition_source,acquisition_source_detail").eq("user_id", profile.id).single(),
  ]);
  if (essentials?.error) throw new Error("Could not load your saved onboarding progress. Please try again.");
  const row = essentials?.data;
  return <OnboardingFlow profile={profile} agencies={agencies} initialEssentials={row ? {
    dateOfBirth: row.date_of_birth?.slice(0, 10) ?? "", username: row.username ?? "",
    headshotUrls: row.headshot_urls ?? [], headshotOriginalUrls: row.headshot_original_urls ?? [],
    displayName: row.display_name || profile.fullName || "", acquisitionSource: row.acquisition_source ?? "",
    acquisitionSourceDetail: row.acquisition_source_detail ?? "",
  } : undefined} />;
}
