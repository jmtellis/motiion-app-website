import { AccountSessionBoundary } from "@/components/auth/AccountSessionBoundary";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { SharedRosterView } from "@/components/talent-buyers/library/SharedRosterView";

export const metadata = { title: "Shared roster · Motiion", robots: { index: false, follow: false } };
export default async function SharedRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAuth();
  const { id } = await params;
  return <AccountSessionBoundary userId={profile.id}><main className="min-h-dvh bg-[var(--ui-canvas)] px-5 py-8 text-[var(--ui-text)] sm:px-8"><div className="mx-auto max-w-5xl"><Link className="mb-6 inline-block text-sm underline underline-offset-4" href="/shared/rosters">Shared with you</Link><SharedRosterView key={`${profile.id}:${id}`} listId={id}/></div></main></AccountSessionBoundary>;
}
