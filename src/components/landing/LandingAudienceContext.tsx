"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  LANDING_DEFAULT_AUDIENCE,
  landingAudienceSegments,
  type MarketingTab,
} from "@/lib/marketing/marketing-pages";

export const LANDING_AUDIENCE_TABS_ID = "landing-audience";
export const LANDING_AUDIENCE_PANEL_ID = "landing-audience-panel";

type LandingAudienceContextValue = {
  audience: MarketingTab;
  setAudience: (next: MarketingTab) => void;
};

const LandingAudienceContext = createContext<LandingAudienceContextValue | null>(null);

function syncAudienceParam(audience: MarketingTab) {
  const url = new URL(window.location.href);
  url.searchParams.set("audience", audience);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function LandingAudienceProvider({
  initial = LANDING_DEFAULT_AUDIENCE,
  children,
}: {
  initial?: MarketingTab;
  children: ReactNode;
}) {
  const [audience, setAudienceState] = useState<MarketingTab>(initial);

  const setAudience = useCallback(
    (next: MarketingTab) => {
      // Keep audience changes in place so the hero remains in view.
      if (audience === next) return;

      setAudienceState(next);
      syncAudienceParam(next);
    },
    [audience],
  );

  const value = useMemo(
    () => ({ audience, setAudience }),
    [audience, setAudience],
  );

  return (
    <LandingAudienceContext.Provider value={value}>{children}</LandingAudienceContext.Provider>
  );
}

export function useLandingAudience() {
  const context = useContext(LandingAudienceContext);
  if (!context) {
    throw new Error("useLandingAudience must be used within LandingAudienceProvider");
  }
  return context;
}

export function useLandingAudienceOptional() {
  return useContext(LandingAudienceContext);
}

export function useLandingAudienceContent() {
  const { audience } = useLandingAudience();
  return landingAudienceSegments.find((segment) => segment.id === audience) ?? landingAudienceSegments[1];
}
