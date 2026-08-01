"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { useIndustryProOptional } from "./IndustryProContext";

/** Subtle lock mark for Pro-gated CTAs when the user is on Free. */
export function ProLockHint({ className = "size-3.5" }: { className?: string }) {
  const { hasIndustryPro } = useIndustryProOptional();
  if (hasIndustryPro) return null;
  return <Lock className={`shrink-0 opacity-70 ${className}`} aria-hidden />;
}

export function withProLockLabel(label: ReactNode, locked: boolean) {
  if (!locked) return label;
  return (
    <span className="pro-lock-affordance">
      <Lock className="size-3.5 shrink-0 opacity-70" aria-hidden />
      {label}
    </span>
  );
}
