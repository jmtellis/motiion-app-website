import { formatHeight, parseHeight } from "@/lib/onboarding/height";

export type HeightFilterMode = "any" | "under" | "above" | "between";

export type HeightFilterValue = {
  mode: HeightFilterMode;
  /** Inclusive bound in total inches (for under / above / between low). */
  minInches: number;
  /** Inclusive bound in total inches (for between high / unused otherwise). */
  maxInches: number;
};

/** Practical dancer height span for the slider. */
export const HEIGHT_SLIDER_MIN = 54; // 4'6"
export const HEIGHT_SLIDER_MAX = 84; // 7'0"
export const HEIGHT_SLIDER_DEFAULT_LOW = 66; // 5'6"
export const HEIGHT_SLIDER_DEFAULT_HIGH = 70; // 5'10"

function heightStringToInches(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^(under|above|between):/i.test(trimmed)) return null;
  if (trimmed.startsWith("Under ") || trimmed.includes("and above") || trimmed.includes("–")) {
    return null;
  }
  const { feet, inches } = parseHeight(trimmed);
  if (feet < 3 || feet > 8) return null;
  return feet * 12 + inches;
}

export function inchesToHeightLabel(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return formatHeight(feet, inches);
}

export function parseHeightFilter(raw: string | null | undefined): HeightFilterValue {
  const value = raw?.trim() ?? "";
  if (!value) {
    return {
      mode: "any",
      minInches: HEIGHT_SLIDER_DEFAULT_LOW,
      maxInches: HEIGHT_SLIDER_DEFAULT_HIGH,
    };
  }

  const underMatch = /^under:(\d+)$/i.exec(value);
  if (underMatch) {
    return {
      mode: "under",
      minInches: Number(underMatch[1]),
      maxInches: HEIGHT_SLIDER_DEFAULT_HIGH,
    };
  }

  const aboveMatch = /^above:(\d+)$/i.exec(value);
  if (aboveMatch) {
    return {
      mode: "above",
      minInches: Number(aboveMatch[1]),
      maxInches: HEIGHT_SLIDER_DEFAULT_HIGH,
    };
  }

  const betweenMatch = /^between:(\d+)-(\d+)$/i.exec(value);
  if (betweenMatch) {
    const low = Number(betweenMatch[1]);
    const high = Number(betweenMatch[2]);
    return {
      mode: "between",
      minInches: Math.min(low, high),
      maxInches: Math.max(low, high),
    };
  }

  if (value === "Under 5'6\"") {
    return { mode: "under", minInches: 65, maxInches: HEIGHT_SLIDER_DEFAULT_HIGH };
  }
  if (value === "5'6\" – 5'9\"") {
    return { mode: "between", minInches: 66, maxInches: 69 };
  }
  if (value === "5'10\" and above") {
    return { mode: "above", minInches: 70, maxInches: HEIGHT_SLIDER_DEFAULT_HIGH };
  }

  const exact = heightStringToInches(value);
  if (exact != null) {
    return { mode: "between", minInches: exact, maxInches: exact };
  }

  return {
    mode: "any",
    minInches: HEIGHT_SLIDER_DEFAULT_LOW,
    maxInches: HEIGHT_SLIDER_DEFAULT_HIGH,
  };
}

export function serializeHeightFilter(value: HeightFilterValue): string {
  if (value.mode === "any") return "";
  if (value.mode === "under") return `under:${value.minInches}`;
  if (value.mode === "above") return `above:${value.minInches}`;
  const low = Math.min(value.minInches, value.maxInches);
  const high = Math.max(value.minInches, value.maxInches);
  return `between:${low}-${high}`;
}

export function formatHeightFilterLabel(raw: string | null | undefined): string {
  const parsed = parseHeightFilter(raw);
  if (parsed.mode === "any") return "";
  if (parsed.mode === "under") return `Under ${inchesToHeightLabel(parsed.minInches)}`;
  if (parsed.mode === "above") return `${inchesToHeightLabel(parsed.minInches)} and above`;
  return `${inchesToHeightLabel(parsed.minInches)} – ${inchesToHeightLabel(parsed.maxInches)}`;
}

export function profileMatchesHeightFilter(
  profileHeight: string | null | undefined,
  heightFilter: string | null | undefined,
): boolean {
  const filter = heightFilter?.trim() ?? "";
  if (!filter) return true;

  const totalInches = heightStringToInches(profileHeight);
  if (totalInches == null) return false;

  const parsed = parseHeightFilter(filter);
  if (parsed.mode === "any") return true;
  if (parsed.mode === "under") return totalInches <= parsed.minInches;
  if (parsed.mode === "above") return totalInches >= parsed.minInches;
  return totalInches >= parsed.minInches && totalInches <= parsed.maxInches;
}
