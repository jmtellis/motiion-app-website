import { AppShell } from "@/components/app/AppShell";
import { isHiringAccount, getProfileDestination } from "@/lib/auth/profile";
import { requireCompleteProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCompleteProfile();
  if (isHiringAccount(profile.accountType)) {
    redirect(getProfileDestination(profile));
  }
  return <AppShell profile={profile}>{children}</AppShell>;
}
