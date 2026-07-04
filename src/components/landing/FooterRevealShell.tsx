import type { ReactNode } from "react";

import { Footer } from "@/components/landing/Footer";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FooterRevealShell({
  children,
  surfaceClass = "bg-black",
}: {
  children: ReactNode;
  surfaceClass?: string;
}) {
  return (
    <div className="marketing-footer-reveal">
      <div className={cn("marketing-footer-reveal__content", surfaceClass)}>{children}</div>
      <div className="marketing-footer-reveal__spacer" aria-hidden />
      <div className="marketing-footer-reveal__footer">
        <Footer />
      </div>
    </div>
  );
}
