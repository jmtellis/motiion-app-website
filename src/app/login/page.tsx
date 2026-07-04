import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

function LoginFormFallback() {
  return (
    <div className="ui-card mx-auto w-full max-w-md p-6 text-sm text-[var(--ink-soft)]">
      Loading sign-in…
    </div>
  );
}

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getProfileDestination(profile));
  }

  return (
    <AuthPageShell>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
