import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";

export default async function SignupPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getProfileDestination(profile));
  }

  const shell = getSetupFlowShellProps({ audience: "talent", surface: "signup" });

  return (
    <SignupSplitShell {...shell}>
      <SignupForm />
    </SignupSplitShell>
  );
}
