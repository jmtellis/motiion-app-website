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
  /** Optional leading control (e.g. project cover avatar) before breadcrumbs. */
  leading?: ReactNode;
  end?: ReactNode;
  /** Bumps chrome re-registration when actions change */
  revision?: string | number;
  /**
   * 0–100. When set, the chrome bottom border becomes a progress track.
   * Pass `null` to clear. Omitted values are preserved across `setChrome`.
   */
  progressPercent?: number | null;
};

type BuyerPageChromeContextValue = {
  chrome: BuyerPageChromeConfig;
  setChrome: (config: BuyerPageChromeConfig) => void;
  setChromeProgress: (progressPercent: number | null) => void;
  clearChrome: () => void;
};

const BuyerPageChromeContext = createContext<BuyerPageChromeContextValue | null>(null);

export function BuyerPageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<BuyerPageChromeConfig>({});

  const setChrome = useCallback((config: BuyerPageChromeConfig) => {
    setChromeState((previous) => ({
      ...config,
      // Keep live wizard progress unless the caller sets it explicitly.
      progressPercent:
        config.progressPercent !== undefined ? config.progressPercent : previous.progressPercent,
    }));
  }, []);

  const setChromeProgress = useCallback((progressPercent: number | null) => {
    setChromeState((previous) => ({ ...previous, progressPercent }));
  }, []);

  const clearChrome = useCallback(() => {
    setChromeState({});
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
      setChromeProgress,
      clearChrome,
    }),
    [chrome, setChrome, setChromeProgress, clearChrome],
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
