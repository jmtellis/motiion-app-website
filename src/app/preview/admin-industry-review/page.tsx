import { notFound } from "next/navigation";
import Link from "next/link";
import { IndustryApplicationReview } from "@/components/admin/IndustryApplicationReview";
import { industryReviewProfile } from "@/lib/admin-dashboard/industry-review";
import "@/components/admin/dashboard/dashboard.css";

// Local-only, fictional fixture rendering. No database read or decision authority.
export default function IndustryReviewPreview() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_APP_ENV !== "staging") notFound();
  const user_id="64f0e883-6eaa-4d0b-9a10-55e797ab3b29";
  const application={user_id,full_name:"DEMO Morgan Lane - Industry Review",professional_role:"Creative producer (fictional)",organization:"DEMO Blue Lantern Studio - fictional",contact_email:"demo-review-industry-20261031@example.invalid",work_url:"",hiring_projects:"FICTIONAL STAGING SUBMISSION: Planning a sample contemporary showcase with six dancers and two rehearsal sessions. This studio, project, and applicant are invented for review practice. No real hiring activity. Please try requesting more information about work samples, or approving/rejecting this demo account.",status:"pending" as const,version:1,feedback:null,submitted_at:"2026-10-31T15:27:48.535571Z"};
  const profile=industryReviewProfile(user_id,{error:null,rows:[{user_id,industry_avatar_url:`https://mvkvztpvakybrhyupown.supabase.co/storage/v1/object/public/headshots/${user_id}/admin-review-demo-20261031.png`,acquisition_source:"event",acquisition_source_detail:"DEMO: Heard about Motiion at a fictional Blue Lantern Studio showcase. Staging review practice only."}]});
  return <main className="launch-admin workspace-shell" style={{display:"block",minHeight:"100vh",height:"auto",background:"#f3f4f6",padding:"clamp(12px,3vw,32px)",color:"#17181c"}}><div style={{maxWidth:840,margin:"0 auto"}}><p style={{marginBottom:16}}>Local staging demo · read-only preview · <Link href="/admin/analytics?view=reviews">Open live Reviews</Link></p><article className="launch-card" style={{background:"white",padding:"clamp(16px,3vw,28px)"}}><IndustryApplicationReview application={application} profile={profile} disabled/></article></div></main>;
}
