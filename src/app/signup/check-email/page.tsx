import { redirect } from "next/navigation";

import { CheckEmailForm } from "@/components/auth/CheckEmailForm";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";

type PageProps = {
  searchParams: Promise<{ email?: string; next?: string }>;
};

function resolveEmailParam(value: string | undefined) {
  const email = value?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export default async function SignupCheckEmailPage({ searchParams }: PageProps) {
  const profile = await getCurrentUserProfile();

  const params = await searchParams;
  const email = resolveEmailParam(params.email);

  if (!email) {
    redirect("/signup");
  }

  if (profile?.accountType && profile.email?.toLowerCase() === email.toLowerCase()) {
    redirect(`/auth/continue${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`);
  }

  const shell = getSetupFlowShellProps({ audience: "talent", surface: "checkEmail" });

  return (
    <SignupSplitShell {...shell}>
      <CheckEmailForm email={email} returnTo={params.next} signedInEmail={profile?.email ?? undefined} accountType="talent" />
    </SignupSplitShell>
  );
}
