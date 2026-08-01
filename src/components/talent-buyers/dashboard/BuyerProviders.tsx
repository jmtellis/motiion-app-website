"use client";

import type { ReactNode } from "react";

import { IndustryProProvider } from "@/components/talent-buyers/billing/IndustryProContext";

import { CommandPalette } from "./CommandPalette";
import { BuyerPageChromeProvider } from "./BuyerPageChromeContext";
import { ProjectsViewModeProvider } from "./ProjectsViewModeContext";
import { ToastProvider } from "./ToastProvider";

export function BuyerProviders({
  children,
  hasIndustryPro = true,
}: {
  children: ReactNode;
  hasIndustryPro?: boolean;
}) {
  return (
    <ToastProvider>
      <IndustryProProvider hasIndustryPro={hasIndustryPro}>
        <BuyerPageChromeProvider>
          <ProjectsViewModeProvider>
            {children}
            <CommandPalette />
          </ProjectsViewModeProvider>
        </BuyerPageChromeProvider>
      </IndustryProProvider>
    </ToastProvider>
  );
}
