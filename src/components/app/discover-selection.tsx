"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Talent } from "@/lib/talent-navigator/types";

type DiscoverTalentApi = {
  openTalent: (talent: Talent) => void;
  lookupTalent: (id: string) => Talent | undefined;
  /** Currently open preview panel talent, for card selection indicators. */
  selectedTalentId: string | null;
};

const DiscoverTalentContext = createContext<DiscoverTalentApi>({
  openTalent: () => {},
  lookupTalent: () => undefined,
  selectedTalentId: null,
});

export function DiscoverTalentProvider({
  value,
  children,
}: {
  value: DiscoverTalentApi;
  children: ReactNode;
}) {
  return <DiscoverTalentContext.Provider value={value}>{children}</DiscoverTalentContext.Provider>;
}

export function useDiscoverTalent() {
  return useContext(DiscoverTalentContext);
}
