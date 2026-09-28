import { redirect } from "next/navigation";

import { TalentBuyerOnboardingFlow } from "@/components/talent-buyers/TalentBuyerOnboardingFlow";
import { IndustryAccessGate } from "@/components/talent-buyers/IndustryAccessGate";
import { getActiveShell, hasEnabledShell, isCommunityAccount, isOnboardingComplete } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function TalentBuyerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ addShell?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAuth();
  const addingIndustry = params.addShell === "industry";

  if (addingIndustry) {
    const canAdd =
      isOnboardingComplete(profile) &&
      hasEnabledShell(profile, "talent") &&
      !hasEnabledShell(profile, "lookingForTalent") &&
      !isCommunityAccount(profile.accountType);
    if (!canAdd) redirect(getProfileDestination(profile));
    return (
      <IndustryAccessGate>
        <TalentBuyerOnboardingFlow profile={profile} exitHref="/home" />
      </IndustryAccessGate>
    );
  }

  if (isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  if (getActiveShell(profile) === "talent" || getActiveShell(profile) === "community" || isCommunityAccount(profile.accountType)) {
    redirect("/onboarding");
  }

  if (getActiveShell(profile) !== "lookingForTalent" && profile.accountType !== null) {
    redirect("/onboarding");
  }

  return <TalentBuyerOnboardingFlow profile={profile} />;
}
