import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { isHiringAccount, isOnboardingComplete } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const profile = await requireAuth();

  if (isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  if (isHiringAccount(profile.accountType)) {
    redirect("/talent-buyers/onboarding");
  }

  const agencies = await fetchTalentAgencies();

  return <OnboardingFlow profile={profile} agencies={agencies} />;
}
