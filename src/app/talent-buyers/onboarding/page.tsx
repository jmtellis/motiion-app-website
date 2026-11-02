import { redirect } from "next/navigation";

import { IndustryApprovedSetup } from "@/components/talent-buyers/IndustryApprovedSetup";
import { TalentBuyerOnboardingFlow } from "@/components/talent-buyers/TalentBuyerOnboardingFlow";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveShell, hasEnabledShell, isCommunityAccount, isOnboardingComplete } from "@/lib/auth/profile";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function TalentBuyerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ addShell?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAuth();
  const db = await createServerSupabaseClient();
  const approval = db ? await db.rpc("has_industry_approval") : null;
  if (!approval || approval.error || approval.data !== true) redirect("/talent-buyers/application");
  const { data: application } = await db!.from("industry_applications").select("full_name,professional_role,organization,contact_email,work_url,status,intro_completed_at").eq("user_id", profile.id).maybeSingle();
  const applicationProfile = application ? { ...profile, fullName: application.full_name, customRole: application.professional_role, buyerRole: "other" as const, organizationName: application.organization, organizationWebsite: application.work_url } : profile;
  // Approved applicants use the same atomic completion as iOS. Staff/legacy access
  // grants without an application retain their existing professional setup.
  if (application?.status === "approved") {
    if (application.intro_completed_at && profile.buyerOnboardingCompleted) redirect("/dashboard");
    return <IndustryApprovedSetup name={application.full_name} username={profile.username ?? null} />;
  }
  const addingIndustry = params.addShell === "industry";

  if (addingIndustry) {
    const canAdd =
      isOnboardingComplete(profile) &&
      hasEnabledShell(profile, "talent") &&
      !hasEnabledShell(profile, "lookingForTalent") &&
      !isCommunityAccount(profile.accountType);
    if (!canAdd) redirect(getProfileDestination(profile));
    return (
      <TalentBuyerOnboardingFlow profile={applicationProfile} exitHref="/home" />
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

  return <TalentBuyerOnboardingFlow profile={applicationProfile} />;
}
