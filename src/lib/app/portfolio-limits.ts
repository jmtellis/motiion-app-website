import type { PortfolioPlanTier } from "@/lib/app/portfolio-owner";

/** Mirrors iOS `MotiionPlanLimits`: extras past the free cap stay stored but soft-locked. */
export const PORTFOLIO_LIMITS = {
  headshots: { free: 4, pro: 10 },
  highlights: { free: 2, pro: 10 },
  otherVisuals: 5,
} as const;

export function unlockedCount(plan: PortfolioPlanTier, asset: "headshots" | "highlights") {
  return plan === "pro" ? PORTFOLIO_LIMITS[asset].pro : PORTFOLIO_LIMITS[asset].free;
}

export function hasProVisuals(plan: PortfolioPlanTier) {
  return plan === "pro";
}
