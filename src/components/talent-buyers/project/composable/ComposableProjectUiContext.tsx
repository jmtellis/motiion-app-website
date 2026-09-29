"use client";

import { createContext, useContext } from "react";

import type { ProjectAbilityId } from "@/lib/talent-buyers/project-abilities";

export type ComposableProjectUi = {
  openAbilityManager: (preselect?: ProjectAbilityId[]) => void;
  openShellEditor: () => void;
};

export const ComposableProjectUiContext = createContext<ComposableProjectUi | null>(null);

export function useComposableProjectUi() {
  const ctx = useContext(ComposableProjectUiContext);
  if (!ctx) throw new Error("useComposableProjectUi must be used within ComposableProjectShell");
  return ctx;
}
