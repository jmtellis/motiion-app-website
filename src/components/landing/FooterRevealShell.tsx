import type { ReactNode } from "react";

import { FooterRevealAnimatedPanel } from "@/components/landing/FooterRevealAnimatedPanel";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FooterRevealShell({
  children,
  surfaceClass = "marketing-atmosphere",
  footerBand,
}: {
  children: ReactNode;
  surfaceClass?: string;
  footerBand?: ReactNode;
}) {
  return (
    <div className="marketing-footer-reveal">
      <div className={cn("marketing-footer-reveal__content", surfaceClass)}>{children}</div>
      <FooterRevealAnimatedPanel footerBand={footerBand} />
    </div>
  );
}
