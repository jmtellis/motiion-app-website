import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

export default async function SignupPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getProfileDestination(profile));
  }

  return (
    <AuthPageShell>
      <SignupForm />
    </AuthPageShell>
  );
}
