import { MarketingHeader } from "@/components/landing/MarketingHeader";

/** @deprecated Use MarketingShell + MarketingHeader on marketing routes. */
export async function Navbar() {
  return <MarketingHeader activeTab={null} />;
}
