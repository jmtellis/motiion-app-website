import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardTitle } from "@/components/auth/ui";
import { requireCompleteProfile } from "@/lib/auth/session";

export default async function CalendarPage() {
  const profile = await requireCompleteProfile();

  return (
    <AuthPageShell profile={profile} title="Calendar" subtitle="Your schedule and availability on Motiion.">
      <AuthCard className="max-w-lg">
        <AuthCardHeader>
          <AuthCardTitle>Coming soon</AuthCardTitle>
        </AuthCardHeader>
        <AuthCardContent>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            Calendar and scheduling will be available in a future release. Use the iOS app for schedule features
            today.
          </p>
        </AuthCardContent>
      </AuthCard>
    </AuthPageShell>
  );
}
