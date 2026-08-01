import { notFound } from "next/navigation";

import { BuyerTalentProfileProShell } from "@/components/talent-buyers/billing/BuyerTalentProfileProShell";
import { BuyerTalentProfileTransition } from "@/components/talent-buyers/BuyerTalentProfileTransition";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";
import { recordTalentProfileView } from "@/lib/talent-buyers/dashboard-live";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BuyerTalentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await fetchPublicTalentProfile(slug);

  if (!profile) {
    notFound();
  }

  const talentUserId = profile.user_id ?? profile.id;
  await recordTalentProfileView(talentUserId);

  return (
    <BuyerTalentProfileProShell>
      <BuyerTalentProfileTransition profile={profile} />
    </BuyerTalentProfileProShell>
  );
}
