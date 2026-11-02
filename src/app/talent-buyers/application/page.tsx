import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { hasEnabledShell, isCommunityAccount } from "@/lib/auth/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { IndustryApplicationForm } from "@/components/talent-buyers/IndustryApplicationForm";
import type { IndustryApplication } from "@/lib/talent-buyers/industry-application";
export default async function IndustryApplicationPage() {
  const profile = await requireAuth();
  if (isCommunityAccount(profile.accountType)) redirect("/home");
  const db = await createServerSupabaseClient();
  const result = db ? await db.from("industry_applications").select("*").eq("user_id", profile.id).maybeSingle<IndustryApplication>() : null;
  if (!result || result.error) return <main className="mx-auto max-w-xl p-8"><h1>Applications are temporarily unavailable</h1><p>Your account is safe. Please try again shortly.</p><Link href="/talent-buyers/application">Try again</Link></main>;
  const access = await db!.rpc("has_industry_approval");
  if (access.error) return <main className="mx-auto max-w-xl p-8"><h1>Applications are temporarily unavailable</h1><p>Please try again shortly.</p></main>;
  const application = result.data;
  if (access.data === true) {
    const adding = hasEnabledShell(profile, "talent") && !hasEnabledShell(profile, "lookingForTalent");
    redirect(adding ? "/talent-buyers/onboarding?addShell=industry" : profile.buyerOnboardingCompleted ? "/dashboard" : "/talent-buyers/onboarding");
  }
  return <main className="theme-dark theme-product min-h-screen bg-[#0a0a0a] text-white"><IndustryApplicationForm key={`${application?.version ?? 0}:${application?.status ?? "new"}`} application={application} returnHref={hasEnabledShell(profile, "talent") ? "/home" : "/onboarding"} initial={{
    full_name: application?.full_name ?? (profile.fullName === "Motiion User" ? "" : profile.fullName ?? ""),
    professional_role: application?.professional_role ?? profile.customRole ?? profile.buyerRole ?? "",
    organization: application?.organization ?? profile.organizationName ?? "",
    contact_email: application?.contact_email ?? profile.email ?? "",
    work_url: application?.work_url ?? profile.organizationWebsite ?? "",
    hiring_projects: application?.hiring_projects ?? "",
  }} /></main>;
}
