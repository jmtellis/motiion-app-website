"use client";

import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { LineDrift } from "@/components/landing/LineDrift";
import { Reveal } from "@/components/landing/Reveal";
import type { EditorialPart } from "@/lib/marketing/homepage-content";

export function BrandStatementSection({
  headlineParts,
  dark = true,
}: {
  headlineParts: EditorialPart[];
  dark?: boolean;
}) {
  return (
    <section
      id="brand-statement"
      className="marketing-viewport-section relative flex flex-col overflow-hidden bg-[var(--stage-black)]"
    >
      <LineDrift className="pointer-events-none absolute inset-0 overflow-hidden opacity-60" speed={1.1} />
      <div className="relative z-[1] flex min-h-[inherit] flex-1 flex-col justify-center">
        <Reveal amount={0.18} distance={28}>
          <EditorialHeadline
            parts={headlineParts}
            as="h2"
            size="display-xl"
            dark={dark}
            className="mx-auto max-w-4xl px-6 text-center sm:px-10"
          />
        </Reveal>
      </div>
    </section>
  );
}
