import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

export default async function SignupPage() {
  const profile = await getCurrentUserProfile();

  if (profile?.accountType) {
    redirect(getProfileDestination(profile));
  }


  return (
    <CenteredAuthShell mode="signup">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </CenteredAuthShell>
  );
}
