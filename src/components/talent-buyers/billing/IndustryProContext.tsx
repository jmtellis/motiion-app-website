"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ProFeatureKey } from "@/lib/billing/pro-features";

import { UpgradeProDialog } from "./UpgradeProDialog";

type IndustryProContextValue = {
  hasIndustryPro: boolean;
  /** Returns true when the action may proceed; opens upgrade dialog when locked. */
  requirePro: (feature: ProFeatureKey) => boolean;
  openUpgrade: (feature: ProFeatureKey) => void;
};

const IndustryProContext = createContext<IndustryProContextValue | null>(null);

export function IndustryProProvider({
  hasIndustryPro,
  children,
}: {
  hasIndustryPro: boolean;
  children: ReactNode;
}) {
  const [feature, setFeature] = useState<ProFeatureKey | null>(null);

  const openUpgrade = useCallback((next: ProFeatureKey) => {
    setFeature(next);
  }, []);

  const requirePro = useCallback(
    (next: ProFeatureKey) => {
      if (hasIndustryPro) return true;
      setFeature(next);
      return false;
    },
    [hasIndustryPro],
  );

  const value = useMemo(
    () => ({
      hasIndustryPro,
      requirePro,
      openUpgrade,
    }),
    [hasIndustryPro, openUpgrade, requirePro],
  );

  return (
    <IndustryProContext.Provider value={value}>
      {children}
      <UpgradeProDialog feature={feature} open={feature != null} onClose={() => setFeature(null)} />
    </IndustryProContext.Provider>
  );
}

export function useIndustryPro() {
  const context = useContext(IndustryProContext);
  if (!context) {
    throw new Error("useIndustryPro must be used within IndustryProProvider");
  }
  return context;
}

/** Safe for optional use outside the provider (returns unlocked). */
export function useIndustryProOptional(): IndustryProContextValue {
  return (
    useContext(IndustryProContext) ?? {
      hasIndustryPro: true,
      requirePro: () => true,
      openUpgrade: () => undefined,
    }
  );
}
