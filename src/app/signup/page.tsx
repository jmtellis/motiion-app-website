import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

export default async function SignupPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentUserProfile();

  const params = await searchParams;
  if (profile?.accountType) {
    if(typeof params.next === "string" && params.next.startsWith("/team-invite/")) redirect(params.next);
    redirect(getProfileDestination(profile));
  }


  const requestedType = Array.isArray(params.account_type) ? params.account_type[0] : params.account_type;
  const talentSignup = requestedType === "talent" || params.featured !== undefined;

  const alternateParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => alternateParams.append(key, item));
    else if (value !== undefined) alternateParams.set(key, value);
  }
  alternateParams.set("account_type", talentSignup ? "lookingForTalent" : "talent");

  const teamInvite = typeof params.next === "string" && params.next.startsWith("/team-invite/");

  return (
    <CenteredAuthShell showLogo accountCreation
      mode="signup"
      title={teamInvite ? "Join your project team" : talentSignup ? "Create your talent account" : "Create your industry account"}
      alternateAccount={params.featured !== undefined ? undefined : {
        href: `/signup?${alternateParams}`,
        label: talentSignup ? "Sign up as industry" : "Sign up as talent",
      }}
      subtitle=""
    >
      <Suspense fallback={null}>
        <SignupForm intro={teamInvite
          ? "Create your account to join your project team. Your owner covers access."
          : talentSignup ? "Create your talent profile and find opportunities."
          : "Apply for free, then choose a plan when you’re ready to create a project."} />
      </Suspense>
    </CenteredAuthShell>
  );
}
