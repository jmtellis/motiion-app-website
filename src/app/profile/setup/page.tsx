import { deferredStepsOrdered } from "@/lib/talent/profile-setup";
import { ProfileSetupWizard } from "@/components/talent/ProfileSetupWizard";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { requireTalentAccount } from "@/lib/auth/session";
import { fetchTalentSetupSnapshot } from "@/lib/talent/fetch-setup-snapshot";

export default async function ProfileSetupPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const params = await searchParams;
  const initialStep = deferredStepsOrdered.find(step => step === params.step);
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

  return <ProfileSetupWizard initialStep={initialStep} initialProfile={snapshot.profile} agencies={agencies} />;
}
