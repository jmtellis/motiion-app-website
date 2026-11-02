import type { ReactNode } from "react";

import { MotiionWordmark } from "@/components/brand/MotiionWordmark";

export function EventProgramPoweredBy({ opacity }: { opacity: number }) {
  return (
    <div
      className="event-program-powered-by"
      style={{ opacity }}
      aria-label="Powered by Motiion"
      aria-hidden={opacity < 0.2}
    >
      <p>Powered by</p>
      <MotiionWordmark height={10} />
    </div>
  );
}

export function EventProgramFixedCta({ children }: { children: ReactNode }) {
  return <div className="event-program-fixed-cta">{children}</div>;
}
