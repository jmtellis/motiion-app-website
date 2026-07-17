import { Footer } from "@/components/landing/Footer";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { SiteScrollShell } from "@/components/landing/SiteScrollShell";
import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";

/** Compact shell for pages without the full-viewport hero (e.g. public search). */
export function MarketingShell({
  activeTab = null,
  children,
}: {
  activeTab?: MarketingHeaderTab;
  children: React.ReactNode;
}) {
  return (
    <SiteScrollShell>
      <div className="theme-marketing-dark min-h-screen bg-[#0a0a0a]">
        <div className="relative">
          <MarketingHeader activeTab={activeTab} darkTheme />
        </div>
        {children}
        <Footer />
      </div>
    </SiteScrollShell>
  );
}
