import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

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


  return (
    <CenteredAuthShell mode="login">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </CenteredAuthShell>
  );
}
