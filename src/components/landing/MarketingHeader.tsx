import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";
import { HomeMarketingHeaderClient } from "./HomeMarketingHeaderClient";

export function MarketingHeader({ overlay = false }: {
  activeTab?: MarketingHeaderTab;
  overlay?: boolean;
  darkTheme?: boolean;
}) {
  return <HomeMarketingHeaderClient overlay={overlay} />;
}
