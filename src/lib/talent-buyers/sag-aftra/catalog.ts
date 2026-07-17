import type { RateDetails } from "@/types/casting";

import catalogJson from "./SagAftraDancerWageCatalog.v1.json";

export type SagAftraWagePeriod = "jul2024_jun2025" | "jul2025_jun2026";
export type SagAftraDancerAgreement = "television" | "theatrical" | "codifiedBasic";
export type SagAftraDancerGroupSize = "soloDuo" | "threeToEight" | "ninePlus";
export type SagAftraEmploymentUnit = "daily" | "weekly";

export type SagAftraDancerMinimumAmounts = {
  soloDuoDaily: number;
  threeToEightDaily: number;
  ninePlusDaily: number;
  soloDuoWeekly: number;
  threeToEightWeekly: number;
  ninePlusWeekly: number;
};

type CatalogPeriodAmounts = {
  solo_duo_daily: number;
  three_to_eight_daily: number;
  nine_plus_daily: number;
  solo_duo_weekly: number;
  three_to_eight_weekly: number;
  nine_plus_weekly: number;
};

type CatalogPayload = {
  schema_version: number;
  periods: {
    key: string;
    display_name: string;
    amounts: CatalogPeriodAmounts;
  }[];
  footnotes: {
    rehearsal_eliminated?: string;
    per_diem?: string;
    travel?: string;
  };
};

const catalog = catalogJson as CatalogPayload;

export const SAG_AFTRA_AGREEMENT_OPTIONS: {
  value: SagAftraDancerAgreement;
  label: string;
  shortCode: string;
}[] = [
  { value: "television", label: "Television", shortCode: "TV" },
  { value: "theatrical", label: "Theatrical", shortCode: "Theatrical" },
  { value: "codifiedBasic", label: "Codified Basic", shortCode: "Basic" },
];

export const SAG_AFTRA_GROUP_OPTIONS: {
  value: SagAftraDancerGroupSize;
  label: string;
}[] = [
  { value: "soloDuo", label: "Solo and Duo" },
  { value: "threeToEight", label: "3-8" },
  { value: "ninePlus", label: "9+" },
];

export const SAG_AFTRA_UNIT_OPTIONS: {
  value: SagAftraEmploymentUnit;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function mapAmounts(raw: CatalogPeriodAmounts): SagAftraDancerMinimumAmounts {
  return {
    soloDuoDaily: raw.solo_duo_daily,
    threeToEightDaily: raw.three_to_eight_daily,
    ninePlusDaily: raw.nine_plus_daily,
    soloDuoWeekly: raw.solo_duo_weekly,
    threeToEightWeekly: raw.three_to_eight_weekly,
    ninePlusWeekly: raw.nine_plus_weekly,
  };
}

export function currentSagAftraPeriod(): SagAftraWagePeriod {
  const last = catalog.periods[catalog.periods.length - 1];
  if (last?.key === "jul2024_jun2025" || last?.key === "jul2025_jun2026") {
    return last.key;
  }
  return "jul2025_jun2026";
}

export function sagAftraPeriodLabel(period: SagAftraWagePeriod = currentSagAftraPeriod()): string {
  return catalog.periods.find((entry) => entry.key === period)?.display_name ?? period;
}

export function sagAftraFootnotes() {
  return {
    rehearsalEliminated:
      catalog.footnotes.rehearsal_eliminated ??
      "Rehearsal rate eliminated effective Dec 10, 2023; the applicable daily rate applies.",
    perDiem: catalog.footnotes.per_diem ?? null,
    travel: catalog.footnotes.travel ?? null,
  };
}

function amountsForPeriod(period: SagAftraWagePeriod): SagAftraDancerMinimumAmounts {
  const row = catalog.periods.find((entry) => entry.key === period);
  if (row) return mapAmounts(row.amounts);
  const fallback = catalog.periods[catalog.periods.length - 1];
  if (fallback) return mapAmounts(fallback.amounts);
  return {
    soloDuoDaily: 1246,
    threeToEightDaily: 1092,
    ninePlusDaily: 953,
    soloDuoWeekly: 4010,
    threeToEightWeekly: 3676,
    ninePlusWeekly: 3342,
  };
}

function dailyAmount(amounts: SagAftraDancerMinimumAmounts, group: SagAftraDancerGroupSize): number {
  switch (group) {
    case "soloDuo":
      return amounts.soloDuoDaily;
    case "threeToEight":
      return amounts.threeToEightDaily;
    case "ninePlus":
      return amounts.ninePlusDaily;
  }
}

function weeklyAmount(amounts: SagAftraDancerMinimumAmounts, group: SagAftraDancerGroupSize): number {
  switch (group) {
    case "soloDuo":
      return amounts.soloDuoWeekly;
    case "threeToEight":
      return amounts.threeToEightWeekly;
    case "ninePlus":
      return amounts.ninePlusWeekly;
  }
}

export type SagAftraScaleSelection = {
  agreement: SagAftraDancerAgreement;
  groupSize: SagAftraDancerGroupSize;
  employmentUnit: SagAftraEmploymentUnit;
  period?: SagAftraWagePeriod;
};

export function sagAftraSelectionTitle(selection: SagAftraScaleSelection): string {
  const agreement =
    SAG_AFTRA_AGREEMENT_OPTIONS.find((option) => option.value === selection.agreement)?.shortCode ??
    selection.agreement;
  const group =
    SAG_AFTRA_GROUP_OPTIONS.find((option) => option.value === selection.groupSize)?.label ??
    selection.groupSize;
  const unit =
    SAG_AFTRA_UNIT_OPTIONS.find((option) => option.value === selection.employmentUnit)?.label ??
    selection.employmentUnit;
  return `${agreement} · ${group} · ${unit}`;
}

export function applySagAftraScaleToRateDetails(
  selection: SagAftraScaleSelection,
  existing: RateDetails = {},
): RateDetails {
  const period = selection.period ?? currentSagAftraPeriod();
  const amounts = amountsForPeriod(period);
  const title = sagAftraSelectionTitle(selection);

  const next: RateDetails = {
    ...existing,
    fixed_amount: null,
    rehearsal: null,
    shoot_day: null,
    travel_day: null,
    per_diem: null,
    weekly_rate: null,
    other_label: title,
    other_amount: null,
  };

  if (selection.employmentUnit === "daily") {
    const daily = dailyAmount(amounts, selection.groupSize);
    next.shoot_day = daily;
    next.rehearsal = daily;
  } else {
    next.weekly_rate = weeklyAmount(amounts, selection.groupSize);
  }

  return next;
}
