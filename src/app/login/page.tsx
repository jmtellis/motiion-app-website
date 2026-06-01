import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getProfileDestination(profile));
  }

  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}
