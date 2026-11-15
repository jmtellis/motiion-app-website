import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";
import { HomeMarketingHeaderClient } from "./HomeMarketingHeaderClient";

export function HomeMarketingHeader({ overlayHero = false }: {
  activeTab?: MarketingHeaderTab;
  darkTheme?: boolean;
  wordmarkHeader?: boolean;
  overlayHero?: boolean;
  showAudienceTabs?: boolean;
}) {
  return <HomeMarketingHeaderClient overlay={overlayHero} />;
}
