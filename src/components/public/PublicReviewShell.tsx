import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { Footer } from "@/components/landing/Footer";
import { CastingPublicHeader } from "@/components/casting/CastingPublicHeader";

import "@/app/public-review.css";

export function PublicReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-atmosphere min-h-svh text-[#fafafa]">
      <BrowserThemeColor color="#111111" />
      <CastingPublicHeader />
      <main className="public-review-main">{children}</main>
      <Footer />
    </div>
  );
}
