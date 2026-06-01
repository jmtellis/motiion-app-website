import { Footer } from "@/components/landing/Footer";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
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
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="relative">
        <MarketingHeader activeTab={activeTab} />
      </div>
      {children}
      <Footer />
    </div>
  );
}
