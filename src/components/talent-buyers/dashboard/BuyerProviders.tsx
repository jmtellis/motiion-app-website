"use client";

import type { ReactNode } from "react";

import { CommandPalette } from "./CommandPalette";
import { BuyerPageChromeProvider } from "./BuyerPageChromeContext";
import { ProjectsViewModeProvider } from "./ProjectsViewModeContext";
import { ToastProvider } from "./ToastProvider";

export function BuyerProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <BuyerPageChromeProvider>
        <ProjectsViewModeProvider>
          {children}
          <CommandPalette />
        </ProjectsViewModeProvider>
      </BuyerPageChromeProvider>
    </ToastProvider>
  );
}
