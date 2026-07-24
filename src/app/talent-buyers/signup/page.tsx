import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { TalentBuyerSignupForm } from "@/components/talent-buyers/TalentBuyerSignupForm";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";

export default async function TalentBuyerSignupPage() {
  const profile = await getCurrentUserProfile();

  if (profile?.accountType) {
    redirect(getProfileDestination(profile));
  }

  const shell = getSetupFlowShellProps({ audience: "industry", surface: "signup" });

  return (
    <SignupSplitShell {...shell}>
      <Suspense fallback={null}>
        <TalentBuyerSignupForm />
      </Suspense>
    </SignupSplitShell>
  );
}
