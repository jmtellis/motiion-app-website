import Link from "next/link";

import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";

/** Public casting pages: centered wordmark only (no nav tabs or CTAs). */
export function CastingPublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--stage-black)]/95">
      <div className="mx-auto flex min-h-[4.25rem] w-full max-w-6xl items-center justify-center px-6 py-3 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          <MotiionBrandMark priority inverted />
        </Link>
      </div>
    </header>
  );
}
