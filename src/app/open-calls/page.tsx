import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getActiveShell, getProfileDestination } from "@/lib/auth/profile";

export const metadata = { title: "Casting opportunities · Motiion", description: "Find casting opportunities, respond to invitations, and follow your submissions in your Motiion talent account." };
export default async function OpenCallsPage() {
  const profile = await getCurrentUserProfile();
  if (profile && getActiveShell(profile) === "talent") redirect("/opportunities");
  return <MarketingPageLayout activeTab={null} homeHeader cleanHero heroSize="compact" hero={<div className="mx-auto w-full max-w-4xl px-6"><p className="type-eyebrow">Talent</p><h1 className="type-display mt-3">Your next casting opportunity</h1><p className="type-lead mt-5 max-w-2xl">Browse open castings, respond to invitations, and keep track of your submissions in Opportunities.</p><p className="mt-4 max-w-2xl text-[var(--ink-soft)]">Opportunities are available in your Motiion talent account. Casting requirements and materials are shown before you apply.</p><div className="mt-7 flex flex-wrap gap-3">{profile ? <><Link className="btn-primary" href={getProfileDestination(profile)}>Open your workspace</Link><Link className="btn-secondary" href="/settings">Manage your profiles</Link></> : <><Link className="btn-primary" href="/login?next=%2Fopportunities">Sign in to view opportunities</Link><Link className="btn-secondary" href="/signup?next=%2Fopportunities">Create a talent account</Link></>}</div>{profile ? <p className="mt-4 text-sm text-[var(--ink-soft)]">Use your talent profile to browse and apply. Your current workspace remains available above.</p> : null}</div>}/>;
}
