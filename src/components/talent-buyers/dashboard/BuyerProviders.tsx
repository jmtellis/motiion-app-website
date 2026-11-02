"use client";

import type { ReactNode } from "react";

import { IndustryProProvider } from "@/components/talent-buyers/billing/IndustryProContext";

import { CommandPalette } from "./CommandPalette";
import { BuyerPageChromeProvider } from "./BuyerPageChromeContext";
import { ToastProvider } from "./ToastProvider";

export function BuyerProviders({
  children,
  hasIndustryPro = false,
}: {
  children: ReactNode;
  hasIndustryPro?: boolean;
}) {
  return (
    <ToastProvider>
      <IndustryProProvider hasIndustryPro={hasIndustryPro}>
        <BuyerPageChromeProvider>
            {children}
            <CommandPalette />
        </BuyerPageChromeProvider>
      </IndustryProProvider>
    </ToastProvider>
  );
}
