import { z } from "zod";

/** Max items accepted from model output to bound validation cost. */
const MAX_ARRAY = 12;
const MAX_CLARIFICATIONS = 3;
const MAX_WEIGHT = 1;

export const HARD_FILTER_FIELDS = [
  "location",
  "height",
  "gender",
  "ethnicity",
  "hairColor",
  "eyeColor",
  "unionStatus",
  "representation",
  "agency",
  "danceStyle",
  "skill",
  "availability",
  "subtype",
  "keyword",
  "artist",
  "choreographer",
  "production",
] as const;

export const HARD_FILTER_OPERATORS = [
  "eq",
  "in",
  "between",
  "gte",
  "lte",
  "contains",
] as const;

export const SEMANTIC_CATEGORIES = [
  "movement",
  "visual_direction",
  "career",
  "bio",
  "special_skill",
] as const;

export const INTENT_SOURCES = ["explicit", "interpreted", "clarified", "default"] as const;

export const BRIEF_TOKEN_KINDS = [
  "explicit",
  "inferred",
  "default",
  "verified",
  "excluded",
] as const;

export const REFERENCE_RELATIONS = [
  "opposite",
  "similar",
  "build_around",
  "replacement",
] as const;

export const MATCH_REASON_CATEGORIES = [
  "requirement",
  "movement",
  "visual",
  "credit",
  "relationship",
  "logistics",
] as const;

export const MATCH_EVIDENCE_TYPES = [
  "profile_field",
  "self_selected_tag",
  "credit",
  "verified_relationship",
] as const;

export const SEARCH_ERROR_CODES = [
  "parse_failed",
  "ambiguous_entity",
  "ambiguous_profile",
  "forbidden_reference",
  "ai_unavailable",
  "zero_results",
  "rate_limited",
  "indexing_pending",
] as const;

export const RANKING_PROFILES = [
  "default",
  "credit_exact",
  "opposite_pairing",
  "creative_direction",
  "availability",
] as const;

export const ClarificationOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  value: z.unknown().optional(),
});

export const ClarificationQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.string().min(1).max(64),
  question: z.string().min(1).max(240),
  options: z.array(ClarificationOptionSchema).min(2).max(4),
  recommendedOptionId: z.string().min(1).max(64).optional(),
  effect: z.string().min(1).max(240),
  multiSelect: z.boolean().default(false),
  blocking: z.boolean().default(false),
});

export const HardFilterSchema = z.object({
  field: z.enum(HARD_FILTER_FIELDS),
  operator: z.enum(HARD_FILTER_OPERATORS),
  value: z.unknown(),
  source: z.enum(INTENT_SOURCES),
  label: z.string().min(1).max(160).optional(),
});

export const SemanticConceptSchema = z.object({
  category: z.enum(SEMANTIC_CATEGORIES),
  label: z.string().min(1).max(120),
  normalizedTerms: z.array(z.string().min(1).max(64)).max(MAX_ARRAY).default([]),
  sourceText: z.string().max(200).default(""),
  source: z.enum(["explicit", "interpreted", "clarified"]),
  weight: z.number().min(0).max(MAX_WEIGHT).default(0.5),
});

export const RelationshipRequirementSchema = z.object({
  predicate: z.enum([
    "performed_for",
    "worked_with",
    "appeared_in",
    "trained_with",
    "cast_with",
  ]),
  entityName: z.string().min(1).max(120),
  entityId: z.string().uuid().optional(),
  role: z.enum(["artist", "choreographer", "production"]).default("artist"),
  directOnly: z.boolean().default(true),
  verificationMinimum: z.string().max(64).optional(),
});

export const ReferenceProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  profileId: z.string().uuid().optional(),
  relation: z.enum(REFERENCE_RELATIONS),
  heightToleranceInches: z.number().min(0).max(12).optional(),
});

export const AssumptionSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.unknown(),
  reason: z.string().min(1).max(240),
  editable: z.boolean().default(true),
});

export const BriefTokenSchema = z.object({
  id: z.string().min(1).max(64),
  section: z.enum(["looking_for", "prioritizing", "assumptions"]),
  label: z.string().min(1).max(160),
  kind: z.enum(BRIEF_TOKEN_KINDS),
  removable: z.boolean().default(true),
  /** Maps back to intent mutation when removed/edited. */
  filterKey: z.string().max(64).optional(),
  value: z.unknown().optional(),
});

export const MatchReasonSchema = z.object({
  category: z.enum(MATCH_REASON_CATEGORIES),
  label: z.string().min(1).max(240),
  evidenceType: z.enum(MATCH_EVIDENCE_TYPES),
  evidenceId: z.string().max(64).optional(),
  verificationStatus: z.string().max(64).optional(),
  sourceType: z.string().max(64).optional(),
  caveat: z.string().max(240).optional(),
});

export const SearchIntentSchema = z.object({
  version: z.literal(1),
  originalQuery: z.string().max(500),
  resultType: z.enum(["dancers", "cast"]).default("dancers"),
  hardFilters: z.array(HardFilterSchema).max(MAX_ARRAY).default([]),
  semanticConcepts: z.array(SemanticConceptSchema).max(MAX_ARRAY).default([]),
  relationships: z.array(RelationshipRequirementSchema).max(MAX_ARRAY).default([]),
  referenceProfiles: z.array(ReferenceProfileSchema).max(4).default([]),
  exclusions: z.array(z.unknown()).max(MAX_ARRAY).default([]),
  missingContext: z.array(z.string().max(120)).max(MAX_ARRAY).default([]),
  clarificationQuestions: z
    .array(ClarificationQuestionSchema)
    .max(MAX_CLARIFICATIONS)
    .default([]),
  assumptions: z.array(AssumptionSchema).max(MAX_ARRAY).default([]),
  rankingProfile: z.enum(RANKING_PROFILES).default("default"),
  briefTokens: z.array(BriefTokenSchema).max(40).default([]),
});

/** Raw LLM payload before normalization — looser, then validated into SearchIntent. */
export const LlmSearchIntentDraftSchema = z
  .object({
    artists: z.array(z.string()).optional(),
    choreographers: z.array(z.string()).optional(),
    productions: z.array(z.string()).optional(),
    relationshipMatchMode: z.enum(["all", "any"]).optional(),
    verificationStatuses: z.array(z.string()).optional(),
    location: z.string().optional(),
    danceStyles: z.array(z.string()).optional(),
    genres: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    agencies: z.array(z.string()).optional(),
    representedOnly: z.boolean().optional(),
    hasRepresentation: z.boolean().optional(),
    availableOnly: z.boolean().optional(),
    verifiedProfilesOnly: z.boolean().optional(),
    broadExperienceQuery: z.string().optional(),
    gender: z.string().optional(),
    ethnicities: z.array(z.string()).optional(),
    hairColors: z.array(z.string()).optional(),
    eyeColors: z.array(z.string()).optional(),
    heightMin: z.string().optional(),
    heightMax: z.string().optional(),
    unionStatus: z.string().optional(),
    talentTypes: z.array(z.string()).optional(),
    nameQuery: z.string().optional(),
    subjectiveTerms: z
      .array(
        z.object({
          raw: z.string(),
          translatedLabels: z.array(z.string()).max(6).optional(),
          category: z.enum(SEMANTIC_CATEGORIES).optional(),
        }),
      )
      .max(MAX_ARRAY)
      .optional(),
    referenceProfiles: z
      .array(
        z.object({
          name: z.string().optional(),
          profileId: z.string().optional(),
          relation: z.enum(REFERENCE_RELATIONS),
          heightToleranceInches: z.number().optional(),
        }),
      )
      .max(4)
      .optional(),
    clarificationQuestions: z.array(ClarificationQuestionSchema).max(MAX_CLARIFICATIONS).optional(),
    assumptions: z.array(AssumptionSchema).max(MAX_ARRAY).optional(),
    rankingProfile: z.enum(RANKING_PROFILES).optional(),
    missingContext: z.array(z.string()).max(MAX_ARRAY).optional(),
  })
  .passthrough();

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type HardFilter = z.infer<typeof HardFilterSchema>;
export type SemanticConcept = z.infer<typeof SemanticConceptSchema>;
export type RelationshipRequirement = z.infer<typeof RelationshipRequirementSchema>;
export type ReferenceProfile = z.infer<typeof ReferenceProfileSchema>;
export type Assumption = z.infer<typeof AssumptionSchema>;
export type BriefToken = z.infer<typeof BriefTokenSchema>;
export type MatchReason = z.infer<typeof MatchReasonSchema>;
export type SearchIntent = z.infer<typeof SearchIntentSchema>;
export type LlmSearchIntentDraft = z.infer<typeof LlmSearchIntentDraftSchema>;
export type SearchErrorCode = (typeof SEARCH_ERROR_CODES)[number];
export type RankingProfile = (typeof RANKING_PROFILES)[number];

export function validateSearchIntent(input: unknown): {
  ok: true;
  intent: SearchIntent;
} | {
  ok: false;
  error: string;
} {
  const result = SearchIntentSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.slice(0, 3).map((i) => i.message).join("; "),
    };
  }
  return { ok: true, intent: result.data };
}

export function validateLlmDraft(input: unknown): {
  ok: true;
  draft: LlmSearchIntentDraft;
} | {
  ok: false;
  error: string;
} {
  const result = LlmSearchIntentDraftSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.slice(0, 3).map((i) => i.message).join("; "),
    };
  }
  return { ok: true, draft: result.data };
}

export function emptySearchIntent(originalQuery: string): SearchIntent {
  return {
    version: 1,
    originalQuery,
    resultType: "dancers",
    hardFilters: [],
    semanticConcepts: [],
    relationships: [],
    referenceProfiles: [],
    exclusions: [],
    missingContext: [],
    clarificationQuestions: [],
    assumptions: [],
    rankingProfile: "default",
    briefTokens: [],
  };
}

/** Remove a brief token and mirror the change onto intent filters/concepts. */
export function removeBriefToken(intent: SearchIntent, tokenId: string): SearchIntent {
  const token = intent.briefTokens.find((t) => t.id === tokenId);
  if (!token) return intent;

  const next: SearchIntent = {
    ...intent,
    briefTokens: intent.briefTokens.filter((t) => t.id !== tokenId),
  };

  if (token.filterKey === "location") {
    next.hardFilters = next.hardFilters.filter((f) => f.field !== "location");
  } else if (token.filterKey === "height") {
    next.hardFilters = next.hardFilters.filter((f) => f.field !== "height");
  } else if (token.filterKey === "danceStyle" || token.filterKey === "genre") {
    next.hardFilters = next.hardFilters.filter(
      (f) => !(f.field === "danceStyle" && String(f.value) === String(token.value)),
    );
  } else if (token.filterKey === "semantic") {
    next.semanticConcepts = next.semanticConcepts.filter((c) => c.label !== token.label);
  } else if (token.filterKey === "assumption") {
    next.assumptions = next.assumptions.filter((a) => a.key !== token.value);
  } else if (token.filterKey === "artist") {
    next.relationships = next.relationships.filter(
      (r) => !(r.role === "artist" && r.entityName === String(token.value)),
    );
  } else if (token.filterKey === "choreographer") {
    next.relationships = next.relationships.filter(
      (r) => !(r.role === "choreographer" && r.entityName === String(token.value)),
    );
  } else if (token.filterKey === "production") {
    next.relationships = next.relationships.filter(
      (r) => !(r.role === "production" && r.entityName === String(token.value)),
    );
  } else if (token.filterKey === "reference") {
    next.referenceProfiles = next.referenceProfiles.filter(
      (r) => r.name !== String(token.value) && r.profileId !== String(token.value),
    );
  }

  return next;
}

export function applyClarificationAnswer(
  intent: SearchIntent,
  questionId: string,
  optionIds: string[],
): SearchIntent {
  const question = intent.clarificationQuestions.find((q) => q.id === questionId);
  if (!question) return intent;

  const selected = question.options.filter((o) => optionIds.includes(o.id));
  const next: SearchIntent = {
    ...intent,
    clarificationQuestions: intent.clarificationQuestions.filter((q) => q.id !== questionId),
  };

  if (questionId === "opposite_height_tolerance" && selected[0]) {
    const inches =
      typeof selected[0].value === "number"
        ? selected[0].value
        : Number(String(selected[0].value).replace(/[^\d.]/g, "")) || 2;
    next.referenceProfiles = next.referenceProfiles.map((ref) =>
      ref.relation === "opposite"
        ? { ...ref, heightToleranceInches: inches }
        : ref,
    );
    next.assumptions = [
      ...next.assumptions.filter((a) => a.key !== "opposite_height_tolerance"),
      {
        key: "opposite_height_tolerance",
        value: inches,
        reason: `Height tolerance set to ±${inches} inch${inches === 1 ? "" : "es"}`,
        editable: true,
      },
    ];
    next.briefTokens = [
      ...next.briefTokens.filter((t) => t.id !== "assumption-opposite_height_tolerance"),
      {
        id: "assumption-opposite_height_tolerance",
        section: "assumptions",
        label: `Height tolerance ±${inches}"`,
        kind: "default",
        removable: true,
        filterKey: "assumption",
        value: "opposite_height_tolerance",
      },
    ];
  }

  if (questionId.startsWith("subjective_") && selected.length) {
    const labels = selected.map((o) => o.label);
    const sourceText = question.question;
    for (const label of labels) {
      next.semanticConcepts = [
        ...next.semanticConcepts.filter((c) => c.label !== label),
        {
          category: "visual_direction",
          label,
          normalizedTerms: [label.toLowerCase()],
          sourceText,
          source: "clarified",
          weight: 0.7,
        },
      ];
      next.briefTokens = [
        ...next.briefTokens.filter((t) => t.id !== `semantic-${label}`),
        {
          id: `semantic-${label}`,
          section: "looking_for",
          label,
          kind: "inferred",
          removable: true,
          filterKey: "semantic",
          value: label,
        },
      ];
    }
  }

  if (questionId === "opposite_pairing_goal" && selected[0]) {
    next.assumptions = [
      ...next.assumptions.filter((a) => a.key !== "opposite_pairing_goal"),
      {
        key: "opposite_pairing_goal",
        value: selected[0].value ?? selected[0].id,
        reason: selected[0].label,
        editable: true,
      },
    ];
  }

  return next;
}
