import {
  inchesToHeightLabel,
  serializeHeightFilter,
} from "@/lib/talent-navigator/height-filter";
import { parseHeight } from "@/lib/onboarding/height";
import type {
  Assumption,
  BriefToken,
  ClarificationQuestion,
  MatchReason,
  ReferenceProfile,
} from "@/lib/talent-navigator/search-intent";

export const DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES = 2;

export type OppositeHeightWindow = {
  referenceHeightLabel: string;
  referenceInches: number;
  toleranceInches: number;
  minInches: number;
  maxInches: number;
  /** Serialized for TalentNavigatorFilters.height */
  heightFilter: string;
};

export function heightStringToInches(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^(under|above|between):/i.test(trimmed)) return null;
  if (trimmed.startsWith("Under ") || trimmed.includes("and above") || trimmed.includes("–")) {
    return null;
  }
  const { feet, inches } = parseHeight(trimmed);
  // parseHeight defaults to 5'9" for garbage — reject clearly invalid short inputs
  if (!/\d/.test(trimmed)) return null;
  if (feet < 3 || feet > 8) return null;
  return feet * 12 + inches;
}

/**
 * Build a height-compatible window for opposite pairing.
 * Never inverts gender, ethnicity, body type, or other sensitive traits.
 */
export function buildOppositeHeightWindow(input: {
  referenceHeight: string | null | undefined;
  toleranceInches?: number;
}): OppositeHeightWindow | null {
  const referenceInches = heightStringToInches(input.referenceHeight);
  if (referenceInches == null) return null;

  const toleranceInches =
    input.toleranceInches ?? DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES;
  const minInches = Math.max(48, referenceInches - toleranceInches);
  const maxInches = Math.min(96, referenceInches + toleranceInches);

  return {
    referenceHeightLabel: inchesToHeightLabel(referenceInches),
    referenceInches,
    toleranceInches,
    minInches,
    maxInches,
    heightFilter: serializeHeightFilter({
      mode: "between",
      minInches,
      maxInches,
    }),
  };
}

export function oppositeHeightClarificationQuestions(input?: {
  hasReferenceHeight: boolean;
}): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [
    {
      id: "opposite_height_tolerance",
      category: "Height tolerance",
      question: "How close in height should the opposite be?",
      options: [
        { id: "tol_1", label: "Within 1 inch", value: 1 },
        { id: "tol_2", label: "Within 2 inches — Recommended", value: 2 },
        { id: "tol_custom", label: "Custom (±3 inches)", value: 3 },
        { id: "tol_skip", label: "Skip / use default (±2\")", value: 2 },
      ],
      recommendedOptionId: "tol_2",
      effect: "Sets the hard height window around the referenced dancer.",
      multiSelect: false,
      blocking: !input?.hasReferenceHeight ? false : false,
    },
    {
      id: "opposite_pairing_goal",
      category: "Pairing goal",
      question: "What kind of stage balance are you looking for?",
      options: [
        { id: "sym", label: "Symmetrical stage balance — Recommended", value: "symmetrical" },
        { id: "sil", label: "Similar silhouette", value: "silhouette" },
        { id: "comp", label: "Complementary presence", value: "complementary" },
      ],
      recommendedOptionId: "sym",
      effect: "Guides ranking among height-compatible dancers; does not invert personal traits.",
      multiSelect: false,
      blocking: false,
    },
  ];

  if (!input?.hasReferenceHeight) {
    questions.unshift({
      id: "opposite_missing_height",
      category: "Reference height",
      question: "The referenced dancer has no height on profile. How should we proceed?",
      options: [
        { id: "skip_height", label: "Continue without height filter", value: "skip" },
        { id: "pick_another", label: "Choose a different dancer", value: "reselect" },
      ],
      recommendedOptionId: "skip_height",
      effect: "Without a height, opposite pairing cannot apply a hard height window.",
      multiSelect: false,
      blocking: true,
    });
  }

  return questions.slice(0, 3);
}

export function oppositeAssumptions(toleranceInches: number): Assumption[] {
  return [
    {
      key: "opposite_height_tolerance",
      value: toleranceInches,
      reason: `Default height tolerance ±${toleranceInches} inches (editable)`,
      editable: true,
    },
    {
      key: "opposite_no_trait_inversion",
      value: true,
      reason: "Opposite means stage-balanced height pairing, not inverted personal traits",
      editable: false,
    },
  ];
}

export function oppositeBriefTokens(input: {
  referenceName: string;
  window: OppositeHeightWindow | null;
  toleranceInches: number;
}): BriefToken[] {
  const tokens: BriefToken[] = [
    {
      id: `reference-opposite-${input.referenceName}`,
      section: "looking_for",
      label: `Opposite for ${input.referenceName}`,
      kind: "explicit",
      removable: true,
      filterKey: "reference",
      value: input.referenceName,
    },
  ];

  if (input.window) {
    tokens.push({
      id: "hard-height-opposite",
      section: "looking_for",
      label: `Height ${inchesToHeightLabel(input.window.minInches)} – ${inchesToHeightLabel(input.window.maxInches)}`,
      kind: "explicit",
      removable: true,
      filterKey: "height",
      value: input.window.heightFilter,
    });
  }

  tokens.push({
    id: "assumption-opposite_height_tolerance",
    section: "assumptions",
    label: `Height tolerance ±${input.toleranceInches}"`,
    kind: "default",
    removable: true,
    filterKey: "assumption",
    value: "opposite_height_tolerance",
  });

  return tokens;
}

export function buildOppositeMatchReason(input: {
  candidateHeight: string | null | undefined;
  referenceName: string;
  window: OppositeHeightWindow;
}): MatchReason | null {
  const candidateInches = heightStringToInches(input.candidateHeight);
  if (candidateInches == null) {
    return {
      category: "requirement",
      label: `Included for opposite pairing with ${input.referenceName}; height not listed on profile`,
      evidenceType: "profile_field",
      caveat: "Availability of height data is incomplete.",
    };
  }

  const delta = Math.abs(candidateInches - input.window.referenceInches);
  return {
    category: "requirement",
    label: `Height is within ${delta} inch${delta === 1 ? "" : "es"} of ${input.referenceName} (${input.window.referenceHeightLabel}) for an opposite pairing`,
    evidenceType: "profile_field",
  };
}

export function resolveOppositeTolerance(
  refs: ReferenceProfile[],
  assumptions: Assumption[],
): number {
  const fromRef = refs.find((r) => r.relation === "opposite")?.heightToleranceInches;
  if (typeof fromRef === "number") return fromRef;
  const fromAssumption = assumptions.find((a) => a.key === "opposite_height_tolerance");
  if (fromAssumption && typeof fromAssumption.value === "number") {
    return fromAssumption.value;
  }
  return DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES;
}
