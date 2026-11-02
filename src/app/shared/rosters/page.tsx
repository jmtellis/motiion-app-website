import { AccountSessionBoundary } from "@/components/auth/AccountSessionBoundary";
import Link from "next/link";
import { requireAuth, getProfileDestination } from "@/lib/auth/session";
import { SharedRostersSection } from "@/components/talent-buyers/library/SharedRostersSection";
export const metadata = { title: "Shared rosters · Motiion", robots: { index: false, follow: false } };
export default async function SharedRostersPage() {
  const profile = await requireAuth();
  return <AccountSessionBoundary userId={profile.id}><main className="min-h-dvh bg-[var(--ui-canvas)] px-5 py-8 text-[var(--ui-text)] sm:px-8"><div className="mx-auto max-w-5xl"><Link className="text-sm underline underline-offset-4" href={getProfileDestination(profile)}>Back to Motiion</Link><h1 className="mt-8 text-3xl font-semibold tracking-tight">Shared rosters</h1><p className="mt-2 text-[var(--ui-muted)]">People and notes shared directly with your account.</p><SharedRostersSection key={profile.id}/></div></main></AccountSessionBoundary>;
}
