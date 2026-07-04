const GENDER_ABBREV: Record<string, string> = {
  Male: "M",
  Female: "F",
  "Non-binary": "NB",
};

const HAIR_ABBREV: Record<string, string> = {
  Black: "Blk",
  Blonde: "Blnd",
  Brown: "Brn",
  Red: "Red",
  Other: "Oth",
};

const ETHNICITY_ABBREV: Record<string, string> = {
  "Black / African American": "Blk",
  "White / Caucasian": "Wht",
  "Hispanic / Latino": "Hisp",
  Asian: "Asn",
  "Middle Eastern / North African": "MENA",
  "Native American / Indigenous": "NAM",
  "Pacific Islander": "PIsl",
  "South Asian": "SAsn",
  "Multiracial / Mixed": "Mult",
  Other: "Oth",
  // Legacy / shorthand values seen in search data
  "Asian American": "Asn",
  Black: "Blk",
  Latino: "Hisp",
  White: "Wht",
  Mixed: "Mult",
};

const EYE_ABBREV: Record<string, string> = {
  Amber: "Amb",
  Blue: "Blu",
  Brown: "Brn",
  Green: "Grn",
  Gray: "Gry",
  Mixed: "Mix",
};

export function abbreviateGender(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (GENDER_ABBREV[trimmed]) return GENDER_ABBREV[trimmed];
  if (trimmed.toLowerCase() === "non-binary") return "NB";
  return trimmed;
}

export function abbreviateEthnicity(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const values = trimmed
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return null;
  if (values.length > 1) return "MR";

  const value = values[0];
  return ETHNICITY_ABBREV[value] ?? value;
}

export function abbreviateHairColor(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return HAIR_ABBREV[trimmed] ?? HAIR_ABBREV.Other;
}

export function abbreviateEyeColor(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return EYE_ABBREV[trimmed] ?? EYE_ABBREV.Mixed;
}

export function compactUnionStatus(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "non-union" || lower === "non union" || lower === "no") return "No";
  if (lower.includes("eligible")) return "Eligible";
  if (lower.includes("sag")) return "SAG";
  return trimmed;
}

export function abbreviateCoatLength(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  switch (trimmed) {
    case "Short":
      return "S";
    case "Regular":
      return "R";
    case "Long":
      return "L";
    case "Extra-Long":
      return "XL";
    default:
      return trimmed;
  }
}
