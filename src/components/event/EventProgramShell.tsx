import Link from "next/link";

import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";

import "@/app/public-review.css";

/** Slim shell for at-event program pages: centered wordmark, no marketing footer. */
export function EventProgramShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="event-program-shell marketing-atmosphere min-h-svh text-[#fafafa]">
      <BrowserThemeColor color="#111111" />
      <header className="event-program-shell-header">
        <div className="event-program-shell-header-inner">
          <Link
            href="/"
            className="inline-flex items-center transition-opacity hover:opacity-80"
            aria-label="Motiion home"
          >
            <MotiionWordmark priority height={12} />
          </Link>
        </div>
      </header>
      <main className="event-program-main">{children}</main>
    </div>
  );
}
