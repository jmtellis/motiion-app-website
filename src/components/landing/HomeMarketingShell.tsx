"use client";

import type { ReactNode } from "react";

import { BetaSignupModalProvider } from "@/components/landing/BetaSignupModalProvider";

export function HomeMarketingShell({ children }: { children: ReactNode }) {
  return <BetaSignupModalProvider>{children}</BetaSignupModalProvider>;
}
