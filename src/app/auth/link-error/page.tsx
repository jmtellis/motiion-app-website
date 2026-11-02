import Link from "next/link";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { EmailLinkRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
import { authLinkErrorMessage } from "@/lib/auth/redirects";
export default async function EmailLinkErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const profile = await getCurrentUserProfile();
  return <CenteredAuthShell showAlternateAuth={false} mode="login" title="Let’s get you back in" subtitle={authLinkErrorMessage(error ?? null)}>{profile && <p className="signup-split-hint">Signed in as {profile.email}. <Link className="underline" href={getProfileDestination(profile)}>Continue to this account</Link></p>}<EmailLinkRecoveryForm /></CenteredAuthShell>;
}
