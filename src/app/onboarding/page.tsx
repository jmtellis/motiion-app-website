import { redirect } from "next/navigation";

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

  const agencies = await fetchTalentAgencies();

  return <OnboardingFlow profile={profile} agencies={agencies} />;
}
