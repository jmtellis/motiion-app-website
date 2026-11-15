import { redirect } from "next/navigation";

import { CheckEmailForm } from "@/components/auth/CheckEmailForm";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile } from "@/lib/auth/session";

type PageProps = {
  searchParams: Promise<{ email?: string; next?: string }>;
};

function resolveEmailParam(value: string | undefined) {
  const email = value?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export default async function TalentBuyerSignupCheckEmailPage({ searchParams }: PageProps) {
  const profile = await getCurrentUserProfile();

  const params = await searchParams;
  const email = resolveEmailParam(params.email);

  if (!email) {
    redirect("/signup");
  }

  if (profile?.accountType && profile.email?.toLowerCase() === email.toLowerCase()) {
    redirect(`/auth/continue${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`);
  }

  return (
    <CenteredAuthShell mode="signup" title="Verify your email" subtitle="One more step to your industry application." showAlternateAuth={false}>
      <CheckEmailForm email={email} returnTo={params.next} signedInEmail={profile?.email ?? undefined} accountType="lookingForTalent" />
    </CenteredAuthShell>
  );
}
