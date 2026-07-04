import { redirect } from "next/navigation";

import { TalentBuyerOnboardingFlow } from "@/components/talent-buyers/TalentBuyerOnboardingFlow";
import { isHiringAccount, isOnboardingComplete, isTalentAccount } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function TalentBuyerOnboardingPage() {
  const profile = await requireAuth();

  if (isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  if (isTalentAccount(profile.accountType)) {
    redirect("/onboarding");
  }

  if (!isHiringAccount(profile.accountType) && profile.accountType !== null) {
    redirect("/onboarding");
  }

  return <TalentBuyerOnboardingFlow profile={profile} />;
}
