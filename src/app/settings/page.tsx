import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardTitle } from "@/components/auth/ui";
import { requireCompleteProfile } from "@/lib/auth/session";

export default async function SettingsPage() {
  const profile = await requireCompleteProfile();

  return (
    <AuthPageShell profile={profile} title="Settings" subtitle="Manage your Motiion account preferences.">
      <AuthCard className="max-w-lg">
        <AuthCardHeader>
          <AuthCardTitle>Coming soon</AuthCardTitle>
        </AuthCardHeader>
        <AuthCardContent>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            Account settings will live here. For now, update your profile from onboarding or your public profile
            page.
          </p>
        </AuthCardContent>
      </AuthCard>
    </AuthPageShell>
  );
}
