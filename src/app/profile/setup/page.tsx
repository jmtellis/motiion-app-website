import { ProfileSetupWizard } from "@/components/talent/ProfileSetupWizard";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { requireTalentAccount } from "@/lib/auth/session";
import { fetchTalentSetupSnapshot } from "@/lib/talent/fetch-setup-snapshot";

export default async function ProfileSetupPage() {
  const account = await requireTalentAccount();
  const [snapshot, agencies] = await Promise.all([
    fetchTalentSetupSnapshot(account.id),
    fetchTalentAgencies(),
  ]);

  if (!snapshot) {
    return (
      <p className="p-8 text-sm text-[var(--ink-soft,#888)]">
        Couldn&apos;t load your profile. Refresh and try again.
      </p>
    );
  }

  return <ProfileSetupWizard initialProfile={snapshot.profile} agencies={agencies} />;
}
