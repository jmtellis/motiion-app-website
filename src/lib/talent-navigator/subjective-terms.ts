/**
 * Translate subjective casting language into professional creative directions.
 * Never treat these as objective ratings of dancers.
 */

export type SubjectiveTranslation = {
  raw: string;
  labels: string[];
  category: "visual_direction" | "movement";
  clarificationNeeded: boolean;
  clarificationOptions?: Array<{ id: string; label: string; value: string }>;
  recommendedOptionId?: string;
  effect: string;
};

const SUBJECTIVE_MAP: Array<{
  pattern: RegExp;
  labels: string[];
  category: "visual_direction" | "movement";
  clarificationNeeded?: boolean;
  clarificationOptions?: Array<{ id: string; label: string; value: string }>;
  recommendedOptionId?: string;
  effect: string;
}> = [
  {
    pattern: /\bpretty\b|\bbeautiful\b|\battractive\b|\bhot\b/i,
    labels: ["Polished/commercial", "Camera-ready"],
    category: "visual_direction",
    clarificationNeeded: true,
    clarificationOptions: [
      { id: "polished", label: "Polished/commercial — Recommended", value: "Polished/commercial" },
      { id: "editorial", label: "Editorial/high-fashion", value: "Editorial" },
      { id: "approachable", label: "Approachable", value: "Approachable" },
      { id: "soft", label: "Soft", value: "Soft" },
    ],
    recommendedOptionId: "polished",
    effect: "Ranks dancers who self-select matching visual descriptors; never scores attractiveness.",
  },
  {
    pattern: /\bedgy\b/i,
    labels: [],
    category: "visual_direction",
    clarificationNeeded: true,
    clarificationOptions: [
      { id: "fashion", label: "Fashion/editorial — Recommended", value: "Editorial" },
      { id: "punk", label: "Punk/alternative", value: "Alternative" },
      { id: "street", label: "Street/underground", value: "Street" },
      { id: "dark", label: "Dark/cinematic", value: "Intense" },
    ],
    recommendedOptionId: "fashion",
    effect: "Choose the creative direction that should influence ranking.",
  },
  {
    pattern: /\braw\b/i,
    labels: ["Raw"],
    category: "visual_direction",
    effect: "Prioritizes dancers who self-select raw or underground descriptors.",
  },
  {
    pattern: /\bexpensive\b|\bhigh[- ]?fashion\b/i,
    labels: ["High-fashion", "Editorial"],
    category: "visual_direction",
    effect: "Prioritizes high-fashion and editorial self-selected descriptors.",
  },
  {
    pattern: /\bcamera[- ]?ready\b|\bcommercial\b/i,
    labels: ["Camera-ready", "Commercial"],
    category: "visual_direction",
    effect: "Prioritizes commercial and camera-ready self-selected descriptors.",
  },
  {
    pattern: /\bathletic\b/i,
    labels: ["Athletic"],
    category: "visual_direction",
    effect: "Prioritizes athletic presentation descriptors.",
  },
];

export function translateSubjectiveTerms(query: string): SubjectiveTranslation[] {
  const results: SubjectiveTranslation[] = [];
  const seen = new Set<string>();

  for (const entry of SUBJECTIVE_MAP) {
    const match = query.match(entry.pattern);
    if (!match) continue;
    const raw = match[0]!;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      raw,
      labels: entry.labels,
      category: entry.category,
      clarificationNeeded: Boolean(entry.clarificationNeeded),
      clarificationOptions: entry.clarificationOptions,
      recommendedOptionId: entry.recommendedOptionId,
      effect: entry.effect,
    });
  }

  return results;
}

/** Terms that must never become hard filters or inferred sensitive traits. */
export const FORBIDDEN_INFERENCE_PATTERNS = [
  /\brace\b/i,
  /\bethnicit/i,
  /\bdisability\b/i,
  /\breligion\b/i,
  /\bsexual orientation\b/i,
  /\bgender identity\b/i,
];
