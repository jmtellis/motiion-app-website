import { Suspense } from "react";
import { AccountSessionBoundary } from "@/components/auth/AccountSessionBoundary";
import { getProfileDestination } from "@/lib/auth/profile";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/dashboard/AdminShell";
import "@/components/admin/dashboard/dashboard.css";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requirePlatformAdmin();
  return (
    <AccountSessionBoundary userId={profile.id}><Suspense fallback={<div>Loading admin workspace…</div>}>
      <AdminShell exitHref={getProfileDestination(profile)} viewer={{ fullName: profile.fullName, avatarUrl: profile.avatarUrl }}>{children}</AdminShell>
    </Suspense></AccountSessionBoundary>
  );
}
