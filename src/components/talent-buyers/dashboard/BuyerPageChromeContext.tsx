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

export type BuyerBreadcrumbItem = {
  label: string;
  href?: string;
};

export type BuyerPageChromeConfig = {
  title?: string;
  lede?: string;
  breadcrumbs?: BuyerBreadcrumbItem[];
  end?: ReactNode;
  /** Bumps chrome re-registration when actions change */
  revision?: string | number;
};

type BuyerPageChromeContextValue = {
  chrome: BuyerPageChromeConfig;
  setChrome: (config: BuyerPageChromeConfig) => void;
  clearChrome: () => void;
};

const BuyerPageChromeContext = createContext<BuyerPageChromeContextValue | null>(null);

export function BuyerPageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<BuyerPageChromeConfig>({});

  const setChrome = useCallback((config: BuyerPageChromeConfig) => {
    setChromeState(config);
  }, []);

  const clearChrome = useCallback(() => {
    setChromeState({});
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
      clearChrome,
    }),
    [chrome, setChrome, clearChrome],
  );

  return <BuyerPageChromeContext.Provider value={value}>{children}</BuyerPageChromeContext.Provider>;
}

export function useBuyerPageChromeContext() {
  const context = useContext(BuyerPageChromeContext);
  if (!context) {
    throw new Error("useBuyerPageChromeContext must be used within BuyerPageChromeProvider");
  }
  return context;
}

export function useRegisterBuyerChrome(config: BuyerPageChromeConfig) {
  const { setChrome, clearChrome } = useBuyerPageChromeContext();
  const configRef = useRef(config);
  configRef.current = config;
  const breadcrumbsKey = JSON.stringify(config.breadcrumbs ?? []);

  useEffect(() => {
    setChrome(configRef.current);
    return () => clearChrome();
  }, [config.title, config.lede, breadcrumbsKey, config.revision, setChrome, clearChrome]);
}
