import { notFound } from "next/navigation";

import { loadHomeProfile } from "@/app/(app)/home/actions";
import ProfilePageClient from "@/app/profile/[slug]/profile-page-client";
import { requireHiringAccount } from "@/lib/auth/session";
import { resolveDiscoverBackHref } from "@/lib/app/discover-paths";

export default async function TalentStudioProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireHiringAccount();
  const { slug } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : "talent";
  const { profile } = await loadHomeProfile(slug);
  if (!profile) notFound();

  return (
    <div className="talent-navigator-route">
      <div className="discover-detail discover-detail--profile discover-skel-enter">
        <ProfilePageClient
          profile={profile}
          embedded
          backHref={resolveDiscoverBackHref(from, "/talent")}
        />
      </div>
    </div>
  );
}
