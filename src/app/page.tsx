import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeSplitLanding } from "@/components/landing/HomeSplitLanding";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <HomeMarketingShell>
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <HomeSplitLanding />
    </HomeMarketingShell>
  );
}
