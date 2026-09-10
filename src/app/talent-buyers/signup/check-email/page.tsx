import { redirect } from "next/navigation";

import { CheckEmailForm } from "@/components/auth/CheckEmailForm";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

function resolveEmailParam(value: string | undefined) {
  const email = value?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export default async function TalentBuyerSignupCheckEmailPage({ searchParams }: PageProps) {
  const profile = await getCurrentUserProfile();

  if (profile?.accountType) {
    redirect(getProfileDestination(profile));
  }

  const params = await searchParams;
  const email = resolveEmailParam(params.email);

  if (!email) {
    redirect("/signup");
  }

  const shell = getSetupFlowShellProps({ audience: "industry", surface: "checkEmail" });

  return (
    <SignupSplitShell {...shell}>
      <CheckEmailForm email={email} accountType="lookingForTalent" />
    </SignupSplitShell>
  );
}
