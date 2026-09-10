import { notFound } from "next/navigation";
import Link from "next/link";

import { FeaturedTalentManagePanel } from "@/components/talent-buyers/activities/FeaturedTalentManagePanel";
import { loadFeaturedTalentTree } from "@/lib/talent-buyers/activities/featured-talent";
import { requireTalentAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TalentFeaturedEventManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireTalentAccount();
  const { id: activityId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: activity } = await supabase
    .from("activities")
    .select("id,title,type,status")
    .eq("id", activityId)
    .maybeSingle();

  if (!activity || activity.type !== "event") notFound();

  const tree = await loadFeaturedTalentTree(supabase, activityId);
  const myLevel1 = tree.find(
    (row) => row.talentUserId === profile.id && row.status === "accepted" && !row.parentId,
  );

  if (!myLevel1) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-[#fafafa]">Featured talent</h1>
        <p className="text-sm text-[#8a8a8a]">
          Accept a feature invite for this event before managing your lineup and video.
        </p>
        <Link href="/home" className="text-sm text-[#fafafa] underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#5a5a5a]">
          Featured talent
        </p>
        <h1 className="text-2xl font-semibold text-[#fafafa]">{activity.title}</h1>
        <p className="text-sm text-[#8a8a8a]">
          Add a showcase video link and invite supporting talent under you.
        </p>
        <Link href={`/event/${activityId}`} className="text-sm text-[#fafafa] underline">
          View public event
        </Link>
      </header>

      <FeaturedTalentManagePanel
        activityId={activityId}
        initialTree={tree.filter((row) => row.id === myLevel1.id)}
        canManage={false}
        allowVideoEdit
        level1SelfId={myLevel1.id}
      />
    </div>
  );
}
