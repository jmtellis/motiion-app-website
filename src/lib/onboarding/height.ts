const FEET_RANGE = [3, 4, 5, 6, 7] as const;
const INCHES_RANGE = Array.from({ length: 12 }, (_, index) => index);

export function parseHeight(value: string | null | undefined): { feet: number; inches: number } {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { feet: 5, inches: 9 };
  }

  const normalized = trimmed
    .replace(/\u2019/g, "'")
    .replace(/ft/gi, "'")
    .replace(/in/gi, '"');

  const parts = normalized.split(/['"\s]+/).map((part) => part.replace(/\D/g, "")).filter(Boolean);
  const feet = Number(parts[0]);
  const inches = Number(parts[1] ?? "0");

  if (FEET_RANGE.includes(feet as (typeof FEET_RANGE)[number]) && inches >= 0 && inches <= 11) {
    return { feet, inches };
  }

  return { feet: 5, inches: 9 };
}

export function formatHeight(feet: number, inches: number) {
  return `${feet}'${inches}"`;
}

export { FEET_RANGE, INCHES_RANGE };
