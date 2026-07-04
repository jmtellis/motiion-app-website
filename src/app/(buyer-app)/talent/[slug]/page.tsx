import { notFound } from "next/navigation";

import { BuyerTalentProfileTransition } from "@/components/talent-buyers/BuyerTalentProfileTransition";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BuyerTalentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await fetchPublicTalentProfile(slug);

  if (!profile) {
    notFound();
  }

  return <BuyerTalentProfileTransition profile={profile} />;
}
