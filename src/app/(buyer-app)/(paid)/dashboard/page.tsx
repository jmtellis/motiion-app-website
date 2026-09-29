import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeFeed } from "@/components/app/HomeFeed";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerHomePage() {
  const profile = await requireHiringAccount();
  const firstName = profile.fullName.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${firstName}`
      : hour < 18
        ? `Good afternoon, ${firstName}`
        : `Good evening, ${firstName}`;

  return (
    <HomeFeed
      greeting={greeting}
      discoverySlot={<HomeDiscovery navigatorHref="/talent" />}
    />
  );
}
