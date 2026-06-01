import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const profile = await requireAuth();

  if (isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  const agencies = await fetchTalentAgencies();

  return (
    <AuthPageShell profile={profile} alignFromTop>
      <OnboardingFlow profile={profile} agencies={agencies} />
    </AuthPageShell>
  );
}
