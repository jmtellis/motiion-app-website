import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardTitle } from "@/components/auth/ui";
import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function AccountPage() {
  const profile = await requireAuth();
  const dashboardHref = getProfileDestination(profile);

  return (
    <AuthPageShell profile={profile} title="Account" subtitle="Signed in to Motiion on the web.">
      <AuthCard className="max-w-lg">
        <AuthCardHeader>
          <AuthCardTitle>{profile.fullName}</AuthCardTitle>
        </AuthCardHeader>
        <AuthCardContent>
          <p className="text-sm text-[var(--ink-soft)]">{profile.email}</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link href={dashboardHref} className="btn-primary text-sm">
              Go to dashboard
            </Link>
            <Link href="/" className="btn-outline text-sm">
              Home
            </Link>
          </div>
        </AuthCardContent>
      </AuthCard>
    </AuthPageShell>
  );
}
