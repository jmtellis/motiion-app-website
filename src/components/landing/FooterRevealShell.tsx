import type { ReactNode } from "react";

import { Footer } from "@/components/landing/Footer";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FooterRevealShell({
  children,
  surfaceClass = "bg-[#0a0a0a]",
  footerBand,
}: {
  children: ReactNode;
  surfaceClass?: string;
  footerBand?: ReactNode;
}) {
  return (
    <div className="marketing-footer-reveal">
      <div className={cn("marketing-footer-reveal__content", surfaceClass)}>{children}</div>
      <div className="marketing-footer-reveal__spacer" aria-hidden />
      <div className="marketing-footer-reveal__footer">
        {footerBand ? <div className="marketing-footer-reveal__band">{footerBand}</div> : null}
        <Footer />
      </div>
    </div>
  );
}
