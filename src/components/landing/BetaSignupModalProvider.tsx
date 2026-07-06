"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

import { BetaForm } from "@/components/landing/BetaForm";
import { MarketingDialog } from "@/components/landing/MarketingDialog";
import { betaSignupSection } from "@/lib/marketing/homepage-content";
import { scrollToSignupSection } from "@/lib/marketing/scroll-to-signup";

type BetaSignupModalContextValue = {
  openBetaSignup: () => void;
  closeBetaSignup: () => void;
};

const BetaSignupModalContext = createContext<BetaSignupModalContextValue | null>(null);

export function useBetaSignupModal() {
  const context = useContext(BetaSignupModalContext);
  if (!context) {
    throw new Error("useBetaSignupModal must be used within BetaSignupModalProvider");
  }
  return context;
}

export function BetaSignupModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const openBetaSignup = useCallback(() => setOpen(true), []);
  const closeBetaSignup = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const maybeScrollFromHash = () => {
      if (window.location.hash === "#signup") {
        scrollToSignupSection();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    maybeScrollFromHash();
    window.addEventListener("hashchange", maybeScrollFromHash);
    return () => window.removeEventListener("hashchange", maybeScrollFromHash);
  }, []);

  return (
    <BetaSignupModalContext.Provider value={{ openBetaSignup, closeBetaSignup }}>
      {children}
      {open ? (
        <MarketingDialog
          onClose={closeBetaSignup}
          title={betaSignupSection.title}
          description={betaSignupSection.description}
          titleId={titleId}
          descriptionId={descriptionId}
          panelClassName="max-h-[min(90svh,calc(100svh-2rem))] max-w-lg overflow-y-auto"
        >
          <BetaForm compact embedded dark />
        </MarketingDialog>
      ) : null}
    </BetaSignupModalContext.Provider>
  );
}
