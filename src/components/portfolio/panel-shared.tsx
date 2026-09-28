"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { PortfolioOwnerData } from "@/lib/app/portfolio-owner";

export type PortfolioPanelProps = {
  owner: PortfolioOwnerData;
  actionsHost: HTMLElement | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (message: string) => void;
};

export function PanelActions({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  return host ? createPortal(children, host) : null;
}

export function useReportDirty(dirty: boolean, onDirtyChange: (dirty: boolean) => void) {
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
}
