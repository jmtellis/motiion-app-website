import { notFound, redirect } from "next/navigation";

import { ProductionJobHub } from "@/components/talent-buyers/jobs/ProductionJobHub";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProductionJobHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, status, start_date, end_date, poster_id, job_kind, cover_image_url")
    .eq("id", id)
    .eq("job_kind", "production")
    .maybeSingle();

  if (!job) notFound();

  const [{ data: members }, { data: linked }, { data: tokens }, { data: myCredit }] =
    await Promise.all([
      supabase
        .from("job_members")
        .select("user_id, status, member_role, source")
        .eq("job_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("job_linked_activities")
        .select("id, activity_id, project_id, purpose")
        .eq("job_id", id),
      supabase
        .from("job_join_tokens")
        .select("token, revoked_at, expires_at")
        .eq("job_id", id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("job_resume_credits")
        .select("status, experience_entry_id")
        .eq("job_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const token = tokens?.[0]?.token as string | undefined;
  const joinUrl = token ? `https://www.motiion.app/job/${token}` : null;

  return (
    <div className="px-4 py-8">
      <ProductionJobHub
        job={{
          id: job.id as string,
          title: (job.title as string) || "Untitled job",
          status: (job.status as string) || "upcoming",
          startDate: (job.start_date as string | null) ?? null,
          endDate: (job.end_date as string | null) ?? null,
          isOwner: job.poster_id === user.id,
        }}
        members={(members ?? []).map((row) => ({
          userId: row.user_id as string,
          status: (row.status as string) || "pending",
          role: (row.member_role as string | null) ?? "dancer",
          source: (row.source as string | null) ?? null,
        }))}
        linked={(linked ?? []).map((row) => ({
          id: row.id as string,
          activityId: (row.activity_id as string | null) ?? null,
          projectId: (row.project_id as string | null) ?? null,
          purpose: (row.purpose as string) || "other",
        }))}
        joinUrl={joinUrl}
        myCredit={
          myCredit
            ? {
                status: (myCredit.status as string) || "proposed",
                experienceEntryId: (myCredit.experience_entry_id as string | null) ?? null,
              }
            : null
        }
      />
    </div>
  );
}
