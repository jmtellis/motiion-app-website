"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TalentChromeSlots = {
  start?: ReactNode;
  end?: ReactNode;
};

type TalentChromeContextValue = {
  slots: TalentChromeSlots;
  setChrome: (slots: TalentChromeSlots) => void;
  clearChrome: () => void;
  profileBackRef: React.RefObject<(() => void) | null>;
};

const TalentChromeContext = createContext<TalentChromeContextValue | null>(null);

export function TalentChromeProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<TalentChromeSlots>({});
  const profileBackRef = useRef<(() => void) | null>(null);

  const setChrome = useCallback((next: TalentChromeSlots) => {
    setSlots(next);
  }, []);

  const clearChrome = useCallback(() => {
    setSlots({});
  }, []);

  const value = useMemo(
    () => ({
      slots,
      setChrome,
      clearChrome,
      profileBackRef,
    }),
    [slots, setChrome, clearChrome],
  );

  return <TalentChromeContext.Provider value={value}>{children}</TalentChromeContext.Provider>;
}

export function useTalentChromeContext() {
  const context = useContext(TalentChromeContext);
  if (!context) {
    throw new Error("useTalentChromeContext must be used within TalentChromeProvider");
  }
  return context;
}

export function useRegisterTalentChrome(slots: TalentChromeSlots) {
  const { setChrome, clearChrome } = useTalentChromeContext();

  useEffect(() => {
    setChrome(slots);
    return () => clearChrome();
  }, [slots.start, slots.end, setChrome, clearChrome]);
}

export function useRegisterProfileBackHandler(handler: (() => void) | null) {
  const { profileBackRef } = useTalentChromeContext();

  useEffect(() => {
    profileBackRef.current = handler;
    return () => {
      profileBackRef.current = null;
    };
  }, [handler, profileBackRef]);
}
