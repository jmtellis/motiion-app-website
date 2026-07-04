import { requirePlatformAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return <div className="min-h-screen bg-[var(--paper)]">{children}</div>;
}
