import Link from "next/link";

import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";

import "@/app/public-review.css";

/** Slim shell for at-event program pages: app chrome background, centered header logo. */
export function EventProgramShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="event-program-shell min-h-svh text-[#fafafa]">
      <BrowserThemeColor color="#111111" />
      <div className="event-program-wordmark-bar">
        <Link
          href="/"
          className="inline-flex items-center transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          <MotiionBrandMark priority inverted />
        </Link>
      </div>
      <main className="event-program-main">{children}</main>
    </div>
  );
}
