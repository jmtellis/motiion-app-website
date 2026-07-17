"use client";

import type { ReactNode } from "react";

import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { SmoothScroll } from "@/components/landing/SmoothScroll";

/** Window-level smooth scroll + overscroll lock for public marketing/product routes. */
export function SiteScrollShell({
  children,
  dark = true,
  enabled = true,
}: {
  children: ReactNode;
  dark?: boolean;
  enabled?: boolean;
}) {
  return (
    <SmoothScroll enabled={enabled}>
      <MarketingBodySurface dark={dark} />
      {children}
    </SmoothScroll>
  );
}
