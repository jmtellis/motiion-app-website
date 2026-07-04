import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { Footer } from "@/components/landing/Footer";
import { CastingPublicHeader } from "@/components/casting/CastingPublicHeader";

import "@/app/public-review.css";

export function PublicReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-black text-white">
      <BrowserThemeColor color="#000000" />
      <CastingPublicHeader />
      <main className="public-review-main">{children}</main>
      <Footer />
    </div>
  );
}
