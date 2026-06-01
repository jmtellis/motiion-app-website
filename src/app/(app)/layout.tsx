import { AppShell } from "@/components/app/AppShell";
import { requireCompleteProfile } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCompleteProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
