import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { safeAuthReturnPath } from "@/lib/auth/redirects";

function LoginFormFallback() {
  return (
    <div className="signup-split-form__body">
      <p className="signup-split-form__subtitle">Loading sign-in…</p>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const profile = await getCurrentUserProfile();

  if (profile?.accountType) {
    const { next } = await searchParams;
    const destination = safeAuthReturnPath(next);
    if (destination) {
      if (isOnboardingComplete(profile)) redirect(destination);
      redirect(`/auth/continue?next=${encodeURIComponent(destination)}`);
    }
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
