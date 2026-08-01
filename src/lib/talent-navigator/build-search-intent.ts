import {
  inchesToHeightLabel,
  serializeHeightFilter,
} from "@/lib/talent-navigator/height-filter";
import {
  emptySearchIntent,
  type BriefToken,
  type ClarificationQuestion,
  type HardFilter,
  type LlmSearchIntentDraft,
  type SearchIntent,
  type SemanticConcept,
} from "@/lib/talent-navigator/search-intent";
import { translateSubjectiveTerms } from "@/lib/talent-navigator/subjective-terms";
import {
  DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES,
  oppositeAssumptions,
  oppositeBriefTokens,
  oppositeHeightClarificationQuestions,
} from "@/lib/talent-navigator/opposite-match";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";

/** Legacy NL filter shape used when mapping intent → navigator filters. */
export type NlParsedFilters = {
  gender?: string;
  ethnicities?: string[];
  heightMin?: string;
  heightMax?: string;
  hairColors?: string[];
  eyeColors?: string[];
  talentTypes?: string[];
  location?: string;
  unionStatus?: string;
  hasRepresentation?: boolean;
  agencies?: string[];
  genres?: string[];
  skills?: string[];
  nameQuery?: string;
  artists?: string[];
  choreographers?: string[];
  productions?: string[];
  relationshipMatchMode?: "all" | "any";
  verificationStatuses?: string[];
  danceStyles?: string[];
  representedOnly?: boolean;
  availableOnly?: boolean;
  verifiedProfilesOnly?: boolean;
  broadExperienceQuery?: string;
};

function parseHeightInches(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*['′]\s*(\d+)/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

function heightRangeFilter(min?: string, max?: string): HardFilter | null {
  const minInches = parseHeightInches(min);
  const maxInches = parseHeightInches(max);
  if (minInches == null && maxInches == null) return null;

  if (minInches != null && maxInches != null) {
    const low = Math.min(minInches, maxInches);
    const high = Math.max(minInches, maxInches);
    return {
      field: "height",
      operator: "between",
      value: serializeHeightFilter({ mode: "between", minInches: low, maxInches: high }),
      source: "explicit",
      label: `${inchesToHeightLabel(low)} – ${inchesToHeightLabel(high)}`,
    };
  }
  if (minInches != null) {
    return {
      field: "height",
      operator: "gte",
      value: serializeHeightFilter({ mode: "above", minInches, maxInches: minInches }),
      source: "explicit",
      label: `${inchesToHeightLabel(minInches)} and above`,
    };
  }
  return {
    field: "height",
    operator: "lte",
    value: serializeHeightFilter({
      mode: "under",
      minInches: maxInches!,
      maxInches: maxInches!,
    }),
    source: "explicit",
    label: `Under ${inchesToHeightLabel(maxInches!)}`,
  };
}

function draftToNlParsed(draft: LlmSearchIntentDraft): NlParsedFilters {
  return {
    artists: draft.artists,
    choreographers: draft.choreographers,
    productions: draft.productions,
    relationshipMatchMode: draft.relationshipMatchMode,
    verificationStatuses: draft.verificationStatuses,
    location: draft.location,
    danceStyles: draft.danceStyles,
    genres: draft.genres,
    skills: draft.skills,
    agencies: draft.agencies,
    representedOnly: draft.representedOnly,
    hasRepresentation: draft.hasRepresentation,
    availableOnly: draft.availableOnly,
    verifiedProfilesOnly: draft.verifiedProfilesOnly,
    broadExperienceQuery: draft.broadExperienceQuery,
    gender: draft.gender,
    ethnicities: draft.ethnicities,
    hairColors: draft.hairColors,
    eyeColors: draft.eyeColors,
    heightMin: draft.heightMin,
    heightMax: draft.heightMax,
    unionStatus: draft.unionStatus,
    talentTypes: draft.talentTypes,
    nameQuery: draft.nameQuery,
  };
}

/**
 * Detect opposite / similar / build-around phrasing when the model omits referenceProfiles.
 */
export function heuristicReferenceParse(prompt: string): SearchIntent["referenceProfiles"] {
  const text = prompt.trim();
  const opposite =
    text.match(
      /\b(?:find|looking for|need|want|get)\s+(?:an?\s+)?opposite\s+(?:for|to|of)\s+(.+?)(?:\.|$)/i,
    ) ??
    text.match(/\bopposite\s+(?:for|to|of)\s+(.+?)(?:\.|$)/i) ??
    text.match(/\b(?:an?\s+)?opposite\s+(?:dancer\s+)?(?:for|to|of)\s+(.+?)(?:\.|$)/i);

  if (opposite?.[1]) {
    const name = opposite[1].replace(/[?.!,;:]+$/g, "").trim();
    if (name.length >= 2) {
      return [{ name, relation: "opposite" }];
    }
  }

  const similar =
    text.match(/\bmore like\s+(.+?)(?:\.|,| but | with |$)/i) ??
    text.match(/\bsimilar to\s+(.+?)(?:\.|,| but | with |$)/i);
  if (similar?.[1]) {
    const name = similar[1].replace(/[?.!,;:]+$/g, "").trim();
    if (name.length >= 2) {
      return [{ name, relation: "similar" }];
    }
  }

  const buildAround = text.match(/\bbuild around\s+(.+?)(?:\.|,| with |$)/i);
  if (buildAround?.[1]) {
    const name = buildAround[1].replace(/[?.!,;:]+$/g, "").trim();
    if (name.length >= 2) {
      return [{ name, relation: "build_around" }];
    }
  }

  return [];
}

export function buildSearchIntentFromDraft(input: {
  originalQuery: string;
  draft: LlmSearchIntentDraft | null;
  heuristicCredits: NlParsedFilters | null;
  aiUnavailable?: boolean;
}): SearchIntent {
  const { originalQuery, draft, heuristicCredits, aiUnavailable } = input;
  const intent = emptySearchIntent(originalQuery);
  const merged: LlmSearchIntentDraft = {
    ...(heuristicCredits ?? {}),
    ...(draft ?? {}),
    artists: draft?.artists?.length ? draft.artists : heuristicCredits?.artists,
    choreographers: draft?.choreographers?.length
      ? draft.choreographers
      : heuristicCredits?.choreographers,
    productions: draft?.productions?.length
      ? draft.productions
      : heuristicCredits?.productions,
    relationshipMatchMode:
      draft?.relationshipMatchMode ?? heuristicCredits?.relationshipMatchMode,
  };

  const hardFilters: HardFilter[] = [];
  const briefTokens: BriefToken[] = [];
  const semanticConcepts: SemanticConcept[] = [];
  const clarifications: ClarificationQuestion[] = [];

  if (merged.location?.trim()) {
    hardFilters.push({
      field: "location",
      operator: "contains",
      value: merged.location.trim(),
      source: "explicit",
      label: merged.location.trim(),
    });
    briefTokens.push({
      id: "hard-location",
      section: "looking_for",
      label: merged.location.trim(),
      kind: "explicit",
      removable: true,
      filterKey: "location",
      value: merged.location.trim(),
    });
  }

  const heightFilter = heightRangeFilter(merged.heightMin, merged.heightMax);
  if (heightFilter) {
    hardFilters.push(heightFilter);
    briefTokens.push({
      id: "hard-height",
      section: "looking_for",
      label: heightFilter.label ?? "Height filter",
      kind: "explicit",
      removable: true,
      filterKey: "height",
      value: heightFilter.value,
    });
  }

  if (merged.gender?.trim()) {
    hardFilters.push({
      field: "gender",
      operator: "eq",
      value: merged.gender.trim(),
      source: "explicit",
      label: merged.gender.trim(),
    });
    briefTokens.push({
      id: "hard-gender",
      section: "looking_for",
      label: merged.gender.trim(),
      kind: "explicit",
      removable: true,
      filterKey: "gender",
      value: merged.gender.trim(),
    });
  }

  for (const ethnicity of merged.ethnicities ?? []) {
    if (!ethnicity.trim()) continue;
    hardFilters.push({
      field: "ethnicity",
      operator: "in",
      value: ethnicity.trim(),
      source: "explicit",
      label: ethnicity.trim(),
    });
    briefTokens.push({
      id: `hard-ethnicity-${ethnicity}`,
      section: "looking_for",
      label: ethnicity.trim(),
      kind: "explicit",
      removable: true,
      filterKey: "ethnicity",
      value: ethnicity.trim(),
    });
  }

  for (const hair of merged.hairColors ?? []) {
    if (!hair.trim()) continue;
    hardFilters.push({
      field: "hairColor",
      operator: "in",
      value: hair.trim(),
      source: "explicit",
      label: `${hair.trim()} hair`,
    });
    briefTokens.push({
      id: `hard-hair-${hair}`,
      section: "looking_for",
      label: `${hair.trim()} hair`,
      kind: "explicit",
      removable: true,
      filterKey: "hairColor",
      value: hair.trim(),
    });
  }

  if (merged.unionStatus?.trim()) {
    hardFilters.push({
      field: "unionStatus",
      operator: "eq",
      value: merged.unionStatus.trim(),
      source: "explicit",
      label: merged.unionStatus.trim(),
    });
    briefTokens.push({
      id: "hard-union",
      section: "looking_for",
      label: merged.unionStatus.trim(),
      kind: "explicit",
      removable: true,
      filterKey: "unionStatus",
      value: merged.unionStatus.trim(),
    });
  }

  if (merged.representedOnly || merged.hasRepresentation) {
    hardFilters.push({
      field: "representation",
      operator: "eq",
      value: "Represented",
      source: "explicit",
      label: "Represented",
    });
    briefTokens.push({
      id: "hard-represented",
      section: "looking_for",
      label: "Represented",
      kind: "explicit",
      removable: true,
      filterKey: "representation",
      value: "Represented",
    });
  }

  const styles = [
    ...(merged.danceStyles ?? []),
    ...(merged.genres ?? []),
  ].map((s) => s.trim()).filter(Boolean);
  for (const style of [...new Set(styles)]) {
    hardFilters.push({
      field: "danceStyle",
      operator: "in",
      value: style,
      source: "explicit",
      label: style,
    });
    briefTokens.push({
      id: `hard-style-${style}`,
      section: "looking_for",
      label: style,
      kind: "explicit",
      removable: true,
      filterKey: "danceStyle",
      value: style,
    });
  }

  for (const skill of merged.skills ?? []) {
    if (!skill.trim()) continue;
    hardFilters.push({
      field: "skill",
      operator: "in",
      value: skill.trim(),
      source: "explicit",
      label: skill.trim(),
    });
    briefTokens.push({
      id: `hard-skill-${skill}`,
      section: "looking_for",
      label: skill.trim(),
      kind: "explicit",
      removable: true,
      filterKey: "skill",
      value: skill.trim(),
    });
  }

  // Relationships
  for (const artist of merged.artists ?? []) {
    if (!artist.trim()) continue;
    intent.relationships.push({
      predicate: "worked_with",
      entityName: artist.trim(),
      role: "artist",
      directOnly: true,
    });
    briefTokens.push({
      id: `rel-artist-${artist}`,
      section: "looking_for",
      label: `Worked with ${artist.trim()}`,
      kind: "verified",
      removable: true,
      filterKey: "artist",
      value: artist.trim(),
    });
  }
  for (const choreo of merged.choreographers ?? []) {
    if (!choreo.trim()) continue;
    intent.relationships.push({
      predicate: "trained_with",
      entityName: choreo.trim(),
      role: "choreographer",
      directOnly: true,
    });
    briefTokens.push({
      id: `rel-choreo-${choreo}`,
      section: "looking_for",
      label: `Choreographer: ${choreo.trim()}`,
      kind: "verified",
      removable: true,
      filterKey: "choreographer",
      value: choreo.trim(),
    });
  }
  for (const production of merged.productions ?? []) {
    if (!production.trim()) continue;
    intent.relationships.push({
      predicate: "appeared_in",
      entityName: production.trim(),
      role: "production",
      directOnly: true,
    });
    briefTokens.push({
      id: `rel-prod-${production}`,
      section: "looking_for",
      label: `Production: ${production.trim()}`,
      kind: "verified",
      removable: true,
      filterKey: "production",
      value: production.trim(),
    });
  }

  // Reference profiles from draft or heuristic
  const refs =
    draft?.referenceProfiles?.length
      ? draft.referenceProfiles.map((r) => ({
          name: r.name,
          profileId: r.profileId,
          relation: r.relation,
          heightToleranceInches: r.heightToleranceInches,
        }))
      : heuristicReferenceParse(originalQuery);

  intent.referenceProfiles = refs;

  if (refs.some((r) => r.relation === "opposite")) {
    intent.rankingProfile = "opposite_pairing";
    const tolerance =
      refs.find((r) => r.relation === "opposite")?.heightToleranceInches ??
      DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES;
    intent.assumptions.push(...oppositeAssumptions(tolerance));
    // Clarifications added after profile resolution (may need height)
    clarifications.push(
      ...oppositeHeightClarificationQuestions({ hasReferenceHeight: true }).filter(
        (q) => q.id !== "opposite_missing_height",
      ),
    );
    for (const ref of refs.filter((r) => r.relation === "opposite")) {
      briefTokens.push(
        ...oppositeBriefTokens({
          referenceName: ref.name ?? "selected dancer",
          window: null,
          toleranceInches: tolerance,
        }).filter((t) => t.filterKey === "reference" || t.filterKey === "assumption"),
      );
    }
  } else if (refs.some((r) => r.relation === "similar" || r.relation === "build_around")) {
    intent.rankingProfile = "creative_direction";
  } else if (intent.relationships.length) {
    intent.rankingProfile = "credit_exact";
  }

  // Subjective terms
  const subjective = translateSubjectiveTerms(originalQuery);
  for (const term of draft?.subjectiveTerms ?? []) {
    if (!subjective.some((s) => s.raw.toLowerCase() === term.raw.toLowerCase())) {
      const category =
        term.category === "movement" ? ("movement" as const) : ("visual_direction" as const);
      subjective.push({
        raw: term.raw,
        labels: term.translatedLabels ?? [],
        category,
        clarificationNeeded: !(term.translatedLabels?.length),
        effect: `Interpretation of “${term.raw}” — editable creative direction, not an objective rating.`,
      });
    }
  }

  for (const term of subjective) {
    if (term.clarificationNeeded && term.clarificationOptions?.length) {
      clarifications.push({
        id: `subjective_${term.raw.toLowerCase().replace(/\W+/g, "_")}`,
        category: "Creative direction",
        question: `What should “${term.raw}” mean for this search?`,
        options: term.clarificationOptions,
        recommendedOptionId: term.recommendedOptionId,
        effect: term.effect,
        multiSelect: false,
        blocking: false,
      });
      if (term.labels.length) {
        for (const label of term.labels) {
          semanticConcepts.push({
            category: term.category,
            label,
            normalizedTerms: [label.toLowerCase()],
            sourceText: term.raw,
            source: "interpreted",
            weight: 0.5,
          });
          briefTokens.push({
            id: `semantic-${label}`,
            section: "looking_for",
            label: `${label} — interpretation of “${term.raw}”`,
            kind: "inferred",
            removable: true,
            filterKey: "semantic",
            value: label,
          });
        }
      } else {
        briefTokens.push({
          id: `semantic-pending-${term.raw}`,
          section: "looking_for",
          label: `“${term.raw}” — needs creative direction`,
          kind: "inferred",
          removable: true,
          filterKey: "semantic",
          value: term.raw,
        });
      }
    } else if (term.labels.length) {
      for (const label of term.labels) {
        semanticConcepts.push({
          category: term.category,
          label,
          normalizedTerms: [label.toLowerCase()],
          sourceText: term.raw,
          source: "interpreted",
          weight: 0.6,
        });
        briefTokens.push({
          id: `semantic-${label}`,
          section: "looking_for",
          label: `${label} — interpretation of “${term.raw}”`,
          kind: "inferred",
          removable: true,
          filterKey: "semantic",
          value: label,
        });
      }
    }
  }

  // Assumptions for unused context
  if (!merged.location?.trim() && !originalQuery.match(/\b(LA|NYC|Los Angeles|New York|Chicago|Atlanta|Miami)\b/i)) {
    intent.assumptions.push({
      key: "location_not_required",
      value: true,
      reason: "Location not required",
      editable: true,
    });
    briefTokens.push({
      id: "assumption-location",
      section: "assumptions",
      label: "Location not required",
      kind: "default",
      removable: true,
      filterKey: "assumption",
      value: "location_not_required",
    });
  }

  if (!merged.availableOnly) {
    intent.assumptions.push({
      key: "availability_not_considered",
      value: true,
      reason: "Availability not yet considered",
      editable: true,
    });
    briefTokens.push({
      id: "assumption-availability",
      section: "assumptions",
      label: "Availability not yet considered",
      kind: "default",
      removable: true,
      filterKey: "assumption",
      value: "availability_not_considered",
    });
  }

  if (styles.length || intent.relationships.length) {
    briefTokens.push({
      id: "prio-movement",
      section: "prioritizing",
      label: "Demonstrated movement experience",
      kind: "explicit",
      removable: false,
    });
  }
  if (semanticConcepts.length) {
    briefTokens.push({
      id: "prio-visual",
      section: "prioritizing",
      label: "Visual direction",
      kind: "inferred",
      removable: false,
    });
  }

  if (aiUnavailable) {
    intent.assumptions.push({
      key: "ai_degraded",
      value: true,
      reason: "AI parsing unavailable — using structured and heuristic filters only",
      editable: false,
    });
    briefTokens.push({
      id: "assumption-ai-degraded",
      section: "assumptions",
      label: "Structured search (AI unavailable)",
      kind: "default",
      removable: false,
    });
  }

  // Merge draft clarifications (capped)
  if (draft?.clarificationQuestions?.length) {
    for (const q of draft.clarificationQuestions) {
      if (clarifications.length >= 3) break;
      if (!clarifications.some((c) => c.id === q.id)) clarifications.push(q);
    }
  }

  intent.hardFilters = hardFilters;
  intent.semanticConcepts = semanticConcepts;
  intent.clarificationQuestions = clarifications.slice(0, 3);
  intent.briefTokens = briefTokens;
  intent.missingContext = draft?.missingContext ?? [];

  // Stash nl-parsed shape on a synthetic assumption for legacy filter mapping
  intent.exclusions = [];

  return intent;
}

export function searchIntentToNavigatorFilters(
  intent: SearchIntent,
  legacyParsed?: NlParsedFilters | null,
): Partial<TalentNavigatorFilters> {
  const filters: Partial<TalentNavigatorFilters> = {};

  const location = intent.hardFilters.find((f) => f.field === "location");
  if (location) {
    filters.location = String(location.value);
    filters.locations = [String(location.value)];
  }

  const height = intent.hardFilters.find((f) => f.field === "height");
  if (height) filters.height = String(height.value);

  const gender = intent.hardFilters.find((f) => f.field === "gender");
  if (gender) filters.gender = String(gender.value);

  const union = intent.hardFilters.find((f) => f.field === "unionStatus");
  if (union) filters.unionStatus = String(union.value).replace("Non-Union", "Non-union");

  const representation = intent.hardFilters.find((f) => f.field === "representation");
  if (representation) filters.representation = String(representation.value);

  const styles = intent.hardFilters
    .filter((f) => f.field === "danceStyle")
    .map((f) => String(f.value));
  if (styles.length) {
    filters.genres = styles;
    filters.style = styles[0];
  }

  const skills = intent.hardFilters
    .filter((f) => f.field === "skill")
    .map((f) => String(f.value));
  if (skills.length) filters.skills = skills;

  const ethnicities = intent.hardFilters
    .filter((f) => f.field === "ethnicity")
    .map((f) => String(f.value));
  if (ethnicities.length) {
    filters.ethnicities = ethnicities;
    filters.ethnicity = ethnicities[0];
  }

  const hairColors = intent.hardFilters
    .filter((f) => f.field === "hairColor")
    .map((f) => String(f.value));
  if (hairColors.length) filters.hairColors = hairColors;

  const artists = intent.relationships
    .filter((r) => r.role === "artist")
    .map((r) => r.entityName);
  const choreographers = intent.relationships
    .filter((r) => r.role === "choreographer")
    .map((r) => r.entityName);
  const productions = intent.relationships
    .filter((r) => r.role === "production")
    .map((r) => r.entityName);

  if (artists.length) filters.artists = artists;
  if (choreographers.length) filters.choreographers = choreographers;
  if (productions.length) filters.productions = productions;

  if (legacyParsed?.relationshipMatchMode) {
    filters.relationshipMatchMode = legacyParsed.relationshipMatchMode;
  }
  if (legacyParsed?.verificationStatuses?.length) {
    filters.verificationStatuses = legacyParsed.verificationStatuses;
  }
  if (legacyParsed?.agencies?.length) {
    filters.agencies = legacyParsed.agencies;
    filters.agency = legacyParsed.agencies[0];
  }
  if (legacyParsed?.availableOnly) filters.availability = "Available";
  if (legacyParsed?.talentTypes?.[0]) filters.subtype = legacyParsed.talentTypes[0];

  // Keyword: name query only when no credit entities
  const hasCredits = artists.length + choreographers.length + productions.length > 0;
  if (!hasCredits && legacyParsed?.nameQuery?.trim()) {
    filters.keyword = legacyParsed.nameQuery.trim();
  }

  return filters;
}

export function intentParsedDescription(intent: SearchIntent): string {
  const looking = intent.briefTokens
    .filter((t) => t.section === "looking_for")
    .map((t) => t.label);
  return looking.length ? looking.join(" · ") : `Searching for "${intent.originalQuery}"`;
}

export { draftToNlParsed };

export function mergeIntentIntoFilters(
  base: TalentNavigatorFilters,
  intent: SearchIntent,
  legacyParsed?: NlParsedFilters | null,
): TalentNavigatorFilters {
  const patch = searchIntentToNavigatorFilters(intent, legacyParsed);
  return {
    ...EMPTY_NAVIGATOR_FILTERS,
    ...base,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => {
        if (v == null) return false;
        if (typeof v === "string") return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }),
    ),
  } as TalentNavigatorFilters;
}
