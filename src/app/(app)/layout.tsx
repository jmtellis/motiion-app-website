import { AppShell } from "@/components/app/AppShell";
import {
  getProfileDestination,
  isCommunityAccount,
  isHiringAccount,
  isTalentAccount,
} from "@/lib/auth/profile";
import { requireCompleteProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCompleteProfile();
  // Talent app shell: talent + community. Hiring buyers use the buyer app.
  if (isHiringAccount(profile.accountType)) {
    redirect(getProfileDestination(profile));
  }
  if (!isTalentAccount(profile.accountType) && !isCommunityAccount(profile.accountType)) {
    redirect(getProfileDestination(profile));
  }
  return <AppShell profile={profile}>{children}</AppShell>;
}
