import Link from "next/link";
import { industryReviewProfile } from "@/lib/admin-dashboard/industry-review";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { IndustryApplicationReview } from "@/components/admin/IndustryApplicationReview";
import type { IndustryApplication } from "@/lib/talent-buyers/industry-application";
export default async function IndustryApplicationsPage() {
  await requirePlatformAdmin();
  const db = await createServerSupabaseClient();
  const result = db ? await db.from("industry_applications").select("*").eq("status", "pending").order("submitted_at").limit(100) : null;
  const applications = (result?.data ?? []) as IndustryApplication[];
  const profiles = db && applications.length ? await db.from("profiles").select("user_id,headshot_urls,industry_avatar_url,acquisition_source,acquisition_source_detail,username,date_of_birth").in("user_id", applications.map(a => a.user_id)) : null;
  const profileSource = profiles ? { rows: profiles.data ?? [], error: profiles.error ? "Profile lookup unavailable" : null } : undefined;
  return <main className="mx-auto max-w-3xl space-y-6 p-8"><Link href="/admin/analytics">Admin home</Link><h1 className="text-3xl font-semibold">Industry applications</h1>
    <p>Review professional work and company affiliation. Independent professionals and personal email addresses are welcome. Ask for more information when evidence is unclear.</p>
    {!result || result.error ? <p role="alert">Could not load applications. Refresh to retry.</p> : result.data.length === 0 ? <p>No applications awaiting review.</p> : <>
      <p>Showing the oldest {result.data.length} pending applications. Refresh after reviewing to load more.</p>
      {(result.data as IndustryApplication[]).map(application => <IndustryApplicationReview key={`${application.user_id}:${application.version}`} application={application} profile={industryReviewProfile(application.user_id, profileSource)} />)}
    </>}
  </main>;
}
