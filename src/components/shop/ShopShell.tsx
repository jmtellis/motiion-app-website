import { Footer } from "@/components/landing/Footer";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";

export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <HomeMarketingShell>
      <MarketingBodySurface dark />
      <HomeMarketingHeader darkTheme overlayHero wordmarkHeader />
      {children}
      <Footer />
    </HomeMarketingShell>
  );
}
