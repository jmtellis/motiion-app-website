import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getLoginShellProps } from "@/lib/setup-flow/config";

function LoginFormFallback() {
  return (
    <div className="signup-split-form__body">
      <p className="signup-split-form__subtitle">Loading sign-in…</p>
    </div>
  );
}

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile?.accountType) {
    redirect(getProfileDestination(profile));
  }

  const shell = getLoginShellProps();

  return (
    <SignupSplitShell {...shell}>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </SignupSplitShell>
  );
}
