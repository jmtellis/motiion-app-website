export type SizingTab = "general" | "men" | "women";

export type SizingFieldKey =
  | "waist"
  | "inseam"
  | "glove"
  | "hat"
  | "menTshirt"
  | "menShoe"
  | "menCoat"
  | "menChest"
  | "menNeck"
  | "menSleeve"
  | "menShoeWidth"
  | "womenDress"
  | "womenBust"
  | "womenUnderBust"
  | "womenCup"
  | "womenHip"
  | "womenTshirt"
  | "womenPants"
  | "womenShoe"
  | "womenShoeWidth";

export type SizingValues = Record<SizingFieldKey, string>;

export type SizingFieldConfig = {
  key: SizingFieldKey;
  label: string;
  placeholder: string;
  options: string[];
  units?: string;
};

function intRange(low: number, high: number, step = 1) {
  const values: string[] = [];
  for (let value = low; value <= high; value += step) {
    values.push(String(value));
  }
  return values;
}

function doubleRange(low: number, high: number, step: number) {
  const values: string[] = [];
  for (let value = low; value <= high + 0.001; value += step) {
    values.push(String(Number(value.toFixed(1)).toString().replace(/\.0$/, "")));
  }
  return values;
}

export const sizingOptions = {
  waist: intRange(20, 70),
  inseam: intRange(26, 36),
  glove: doubleRange(6, 12, 0.5),
  hat: intRange(19, 25),
  chest: intRange(24, 63),
  neck: doubleRange(14, 30, 0.5),
  sleeve: doubleRange(15, 40, 0.5),
  coat: ["Short", "Regular", "Long", "Extra-Long"],
  tShirt: ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
  shoeMen: doubleRange(6, 17.5, 0.5),
  shoeWomen: doubleRange(4, 17, 0.5),
  shoeWidth: ["Wide", "Narrow"],
  dressPants: ["00", "0", ...intRange(2, 40, 2)],
  bust: intRange(19, 66),
  underBust: intRange(19, 66),
  cup: ["A", "B", "C", "D", "DD", "DDD", "E", "F"],
  hip: intRange(15, 70),
};

const SUMMARY_KEY_MAP: Record<SizingFieldKey, string> = {
  waist: "Waist",
  inseam: "Inseam",
  glove: "Glove",
  hat: "Hat",
  menTshirt: "T-shirt",
  menShoe: "Shoe",
  menCoat: "Coat",
  menChest: "Chest",
  menNeck: "Neck",
  menSleeve: "Sleeve",
  menShoeWidth: "Shoe Width",
  womenDress: "Dress",
  womenBust: "Bust",
  womenUnderBust: "Under Bust",
  womenCup: "Cup",
  womenHip: "Hip",
  womenTshirt: "T-Shirt(W)",
  womenPants: "Pants",
  womenShoe: "Shoe(W)",
  womenShoeWidth: "Shoe Width(W)",
};

const PARSE_KEY_MAP: Record<string, SizingFieldKey> = Object.fromEntries(
  Object.entries(SUMMARY_KEY_MAP).map(([key, label]) => [label, key as SizingFieldKey]),
) as Record<string, SizingFieldKey>;

export function emptySizingValues(): SizingValues {
  return {
    waist: "",
    inseam: "",
    glove: "",
    hat: "",
    menTshirt: "",
    menShoe: "",
    menCoat: "",
    menChest: "",
    menNeck: "",
    menSleeve: "",
    menShoeWidth: "",
    womenDress: "",
    womenBust: "",
    womenUnderBust: "",
    womenCup: "",
    womenHip: "",
    womenTshirt: "",
    womenPants: "",
    womenShoe: "",
    womenShoeWidth: "",
  };
}

export function parseSizingSummary(summary: string | null | undefined): SizingValues {
  const values = emptySizingValues();
  const trimmed = summary?.trim();
  if (!trimmed) return values;

  for (const segment of trimmed.split(", ")) {
    const colonIndex = segment.indexOf(":");
    if (colonIndex === -1) continue;
    const key = segment.slice(0, colonIndex).trim();
    const value = segment.slice(colonIndex + 1).trim();
    const fieldKey = PARSE_KEY_MAP[key];
    if (fieldKey && value) {
      values[fieldKey] = value;
    }
  }

  return values;
}

export function buildSizingSummary(values: SizingValues) {
  const parts: string[] = [];

  for (const [fieldKey, label] of Object.entries(SUMMARY_KEY_MAP) as Array<[SizingFieldKey, string]>) {
    const value = values[fieldKey]?.trim();
    if (value) {
      parts.push(`${label}: ${value}`);
    }
  }

  return parts.join(", ");
}

export function getSizingFieldsForTab(tab: SizingTab): SizingFieldConfig[] {
  switch (tab) {
    case "general":
      return [
        { key: "waist", label: "Waist", placeholder: "Waist", options: sizingOptions.waist, units: "inches" },
        { key: "inseam", label: "Inseam", placeholder: "Inseam", options: sizingOptions.inseam, units: "inches" },
        { key: "glove", label: "Glove", placeholder: "Glove", options: sizingOptions.glove, units: "inches" },
        { key: "hat", label: "Hat", placeholder: "Hat", options: sizingOptions.hat, units: "inches" },
      ];
    case "men":
      return [
        { key: "menChest", label: "Chest", placeholder: "Chest", options: sizingOptions.chest, units: "inches" },
        { key: "menNeck", label: "Neck", placeholder: "Neck", options: sizingOptions.neck, units: "inches" },
        { key: "menCoat", label: "Jacket", placeholder: "Jacket", options: sizingOptions.coat },
        { key: "menShoe", label: "Shoe", placeholder: "Shoe", options: sizingOptions.shoeMen, units: "US men's" },
        { key: "menShoeWidth", label: "Shoe width", placeholder: "Shoe width", options: sizingOptions.shoeWidth },
        { key: "menSleeve", label: "Sleeve", placeholder: "Sleeve", options: sizingOptions.sleeve, units: "inches" },
        { key: "menTshirt", label: "T-Shirt", placeholder: "T-Shirt", options: sizingOptions.tShirt },
      ];
    case "women":
      return [
        { key: "womenDress", label: "Dress", placeholder: "Dress", options: sizingOptions.dressPants, units: "US" },
        { key: "womenBust", label: "Bust", placeholder: "Bust", options: sizingOptions.bust, units: "inches" },
        {
          key: "womenUnderBust",
          label: "Under-Bust",
          placeholder: "Under-Bust",
          options: sizingOptions.underBust,
          units: "inches",
        },
        { key: "womenCup", label: "Cup", placeholder: "Cup", options: sizingOptions.cup },
        { key: "womenHip", label: "Hip", placeholder: "Hip", options: sizingOptions.hip, units: "inches" },
        { key: "womenTshirt", label: "T-Shirt", placeholder: "T-Shirt", options: sizingOptions.tShirt },
        { key: "womenPants", label: "Pants", placeholder: "Pants", options: sizingOptions.dressPants, units: "US" },
        { key: "womenShoe", label: "Shoe", placeholder: "Shoe", options: sizingOptions.shoeWomen, units: "US women's" },
        { key: "womenShoeWidth", label: "Shoe width", placeholder: "Shoe width", options: sizingOptions.shoeWidth },
      ];
  }
}
