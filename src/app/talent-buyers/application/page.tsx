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
  if (!db) return <ApplicationUnavailable />;
  const [result, access, identity] = await Promise.all([
    db.from("industry_applications").select("*").eq("user_id", profile.id).maybeSingle<IndustryApplication>(),
    db.rpc("has_industry_approval"),
    db.from("profiles").select("username,date_of_birth,industry_avatar_url,acquisition_source,acquisition_source_detail").eq("user_id", profile.id).single(),
  ]);
  if (result.error || access.error || identity.error) return <ApplicationUnavailable />;
  const application = result.data;
  if (access.data === true) {
    const adding = hasEnabledShell(profile, "talent") && !hasEnabledShell(profile, "lookingForTalent");
    redirect(adding ? "/talent-buyers/onboarding?addShell=industry" : profile.buyerOnboardingCompleted ? "/dashboard" : "/talent-buyers/onboarding");
  }
  return <IndustryApplicationForm key={`${profile.id}:${application?.version ?? 0}:${application?.status ?? "new"}`} userId={profile.id} application={application} returnHref={hasEnabledShell(profile, "talent") ? "/home" : "/onboarding"} initial={{
    full_name: application?.full_name ?? (profile.fullName === "Motiion User" ? "" : profile.fullName ?? ""),
    professional_role: application?.professional_role ?? profile.customRole ?? profile.buyerRole ?? "",
    organization: application?.organization ?? profile.organizationName ?? "",
    contact_email: application?.contact_email ?? profile.email ?? "",
    work_url: application?.work_url ?? profile.organizationWebsite ?? "",
    hiring_projects: application?.hiring_projects ?? "",
    username: identity.data.username ?? "", date_of_birth: identity.data.date_of_birth?.slice(0, 10) ?? "",
    avatar_url: identity.data.industry_avatar_url ?? "", acquisition_source: identity.data.acquisition_source ?? "",
    acquisition_source_detail: identity.data.acquisition_source_detail ?? "",
  }} />;
}
function ApplicationUnavailable() {
  return <main className="theme-product mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">Applications are temporarily unavailable</h1><p>Your account and any saved application are safe. Please try again shortly.</p><Link className="btn-primary" href="/talent-buyers/application">Try again</Link><Link className="block underline" href="/settings">Account settings</Link></main>;
}
