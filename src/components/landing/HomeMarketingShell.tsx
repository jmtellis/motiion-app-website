"use client";

import type { ReactNode } from "react";

import { BetaSignupModalProvider } from "@/components/landing/BetaSignupModalProvider";
import { SmoothScroll } from "@/components/landing/SmoothScroll";

export function HomeMarketingShell({ children }: { children: ReactNode }) {
  return (
    <BetaSignupModalProvider>
      <SmoothScroll>{children}</SmoothScroll>
    </BetaSignupModalProvider>
  );
}
