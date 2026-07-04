/** End-of-year and monthly KPI targets from the Motiion business plan. */
export const KPI_GOALS = {
  proSubscribers: 1_000,
  mrrCents: 3_000_000,
  arrCents: 36_000_000,
  annualClasses: 100,
  annualSessions: 100,
  annualCastings: 100,
  annualOpportunities: 300,
  engagementRatePct: 90,
  classFillRatePct: 75,
  avgRsvpsPerSession: 10,
  avgSubmissionsPerCasting: 20,
  northStarMonthly: null as number | null,
} as const;

export function progressPct(current: number, target: number | null): number | null {
  if (target == null || target <= 0) {
    return null;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

export function formatKpiValue(
  value: number,
  format: "number" | "currency" | "percent",
): string {
  if (Number.isNaN(value)) {
    return "—";
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value / 100);
    case "percent":
      return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
}
