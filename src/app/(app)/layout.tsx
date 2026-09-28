import { AppShell } from "@/components/app/AppShell";
import { getActiveShell, getProfileDestination } from "@/lib/auth/profile";
import { requireCompleteProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCompleteProfile();
  const shell = getActiveShell(profile);
  if (shell === "lookingForTalent" || (shell !== "talent" && shell !== "community")) {
    redirect(getProfileDestination(profile));
  }
  return <AppShell profile={profile}>{children}</AppShell>;
}
