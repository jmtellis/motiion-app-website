import {
  buildSearchIntentFromDraft,
  draftToNlParsed,
  heuristicReferenceParse,
  intentParsedDescription,
  type NlParsedFilters,
} from "@/lib/talent-navigator/build-search-intent";
import { callOpenAiJsonObject } from "@/lib/talent-navigator/openai-json";
import {
  TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT,
  TALENT_NAVIGATOR_REPAIR_PROMPT,
} from "@/lib/talent-navigator/prompts";
import {
  validateLlmDraft,
  type SearchIntent,
} from "@/lib/talent-navigator/search-intent";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import type { CreditSearchResultTalent } from "@/lib/talent-navigator/result-transform";
import type { VerificationStatus } from "@/lib/talent-navigator/credit-types";
import {
  inchesToHeightLabel,
  serializeHeightFilter,
} from "@/lib/talent-navigator/height-filter";

export const NL_QUERY_SYSTEM_PROMPT = TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT;

export type { NlParsedFilters };

export type NlParseResult = {
  filters: Partial<TalentNavigatorFilters>;
  parsed: NlParsedFilters;
  parsedDescription: string;
  confidence: number;
  parseFailed?: boolean;
  aiUnavailable?: boolean;
  intent: SearchIntent;
};

function parseHeightInches(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*['′]\s*(\d+)/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

/** Map NL height min/max to range filter string (preferred) or legacy bucket. */
export function heightRangeFromNl(min?: string, max?: string): string {
  const minInches = parseHeightInches(min);
  const maxInches = parseHeightInches(max);
  if (minInches != null && maxInches != null) {
    const low = Math.min(minInches, maxInches);
    const high = Math.max(minInches, maxInches);
    return serializeHeightFilter({ mode: "between", minInches: low, maxInches: high });
  }
  if (minInches != null) {
    return serializeHeightFilter({
      mode: "above",
      minInches,
      maxInches: minInches,
    });
  }
  if (maxInches != null) {
    return serializeHeightFilter({
      mode: "under",
      minInches: maxInches,
      maxInches,
    });
  }
  return "";
}

function splitEntityNames(raw: string): string[] {
  return raw
    .split(/\s+(?:and|&|or|,)\s+/i)
    .map((part) => part.replace(/[?.!,;:]+$/g, "").trim())
    .filter((part) => part.length >= 2 && !/^(a|an|the|some|any)$/i.test(part));
}

/**
 * Deterministic fallback when OpenAI is unavailable or skips credit entities.
 * Covers common buyer phrasing like "worked with Sabrina Carpenter".
 */
export function heuristicCreditParse(prompt: string): NlParsedFilters | null {
  const text = prompt.trim();
  if (!text) return null;

  const choreo =
    text.match(
      /\b(?:choreographed by|trained with|took class(?:es)? (?:from|with)|rehearsed with)\s+(.+)$/i,
    ) ?? null;
  if (choreo?.[1]) {
    const names = splitEntityNames(choreo[1]);
    if (names.length) {
      return {
        choreographers: names,
        relationshipMatchMode: /\bor\b/i.test(choreo[1]) ? "any" : "all",
      };
    }
  }

  const artist =
    text.match(
      /\b(?:worked with|danced (?:for|with)|toured with|performed (?:with|for)|backup(?: dancer)? for)\s+(.+)$/i,
    ) ?? null;
  if (artist?.[1]) {
    const names = splitEntityNames(artist[1]);
    if (names.length) {
      return {
        artists: names,
        relationshipMatchMode: /\bor\b/i.test(artist[1]) ? "any" : "all",
      };
    }
  }

  const production =
    text.match(
      /\b(?:appeared in|was in|cast in|on the)\s+(.+?)(?:\s+tour)?$/i,
    ) ?? null;
  if (production?.[1]) {
    const names = splitEntityNames(production[1]);
    if (names.length) {
      return {
        productions: names,
        relationshipMatchMode: /\bor\b/i.test(production[1]) ? "any" : "all",
      };
    }
  }

  // Blonde / hair color hard filter heuristic
  const hairMatch = text.match(
    /\b(blonde|blond|brunette|brown|black|red|auburn|silver|gray|grey)\s+hair\b|\b(blonde|blond)\b/i,
  );
  const hairColors = hairMatch
    ? [((hairMatch[1] ?? hairMatch[2]) || "").replace(/^blond$/i, "Blonde").replace(/^blonde$/i, "Blonde")]
        .map((h) => (h.toLowerCase() === "blond" || h.toLowerCase() === "blonde" ? "Blonde" : h))
        .filter(Boolean)
    : undefined;

  // Style heuristic
  const styleMatch = text.match(
    /\b(hip[- ]?hop|contemporary|jazz|ballet|heels|house|popping|locking|waacking|breaking|tap|ballroom)\b/i,
  );
  const danceStyles = styleMatch
    ? [
        styleMatch[1]!.replace(/hip[- ]?hop/i, "Hip-Hop").replace(/\b\w/g, (c) =>
          c.toUpperCase(),
        ),
      ]
    : undefined;

  if (hairColors?.length || danceStyles?.length) {
    return {
      hairColors,
      danceStyles: danceStyles?.map((s) =>
        s.toLowerCase().includes("hip") ? "Hip-Hop" : s,
      ),
      genres: danceStyles?.map((s) =>
        s.toLowerCase().includes("hip") ? "Hip-Hop" : s,
      ),
    };
  }

  // Opposite without relying on LLM
  if (heuristicReferenceParse(text).length) {
    return { nameQuery: undefined };
  }

  return null;
}

function buildDescriptionLabels(parsed: NlParsedFilters): string[] {
  const labels: string[] = [];
  if (parsed.artists?.length) labels.push(`Artist: ${parsed.artists.join(", ")}`);
  if (parsed.choreographers?.length) {
    labels.push(`Choreographer: ${parsed.choreographers.join(", ")}`);
  }
  if (parsed.productions?.length) labels.push(`Production: ${parsed.productions.join(", ")}`);
  if (parsed.relationshipMatchMode && (parsed.artists?.length || parsed.choreographers?.length)) {
    labels.push(`Match: ${parsed.relationshipMatchMode}`);
  }
  if (parsed.verificationStatuses?.length) {
    labels.push(`Verification: ${parsed.verificationStatuses.join(", ")}`);
  }
  if (parsed.gender) labels.push(`Gender: ${parsed.gender}`);
  if (parsed.ethnicities?.length) labels.push(`Ethnicity: ${parsed.ethnicities.join(", ")}`);
  if (parsed.heightMin || parsed.heightMax) {
    labels.push(`Height: ${parsed.heightMin ?? "any"} – ${parsed.heightMax ?? "any"}`);
  }
  if (parsed.hairColors?.length) labels.push(`Hair: ${parsed.hairColors.join(", ")}`);
  if (parsed.talentTypes?.length) labels.push(`Type: ${parsed.talentTypes.join(", ")}`);
  if (parsed.location) labels.push(`Location: ${parsed.location}`);
  if (parsed.unionStatus) labels.push(`Union: ${parsed.unionStatus}`);
  if (parsed.hasRepresentation || parsed.representedOnly) labels.push("Represented");
  if (parsed.agencies?.length) labels.push(`Agency: ${parsed.agencies.join(", ")}`);
  if (parsed.genres?.length || parsed.danceStyles?.length) {
    labels.push(`Style: ${(parsed.genres ?? parsed.danceStyles ?? []).join(", ")}`);
  }
  if (parsed.skills?.length) labels.push(`Skills: ${parsed.skills.join(", ")}`);
  if (parsed.broadExperienceQuery) labels.push(`Experience: ${parsed.broadExperienceQuery}`);
  return labels;
}

export function mapNlParsedToNavigatorFilters(parsed: NlParsedFilters): Partial<TalentNavigatorFilters> {
  const artists = parsed.artists?.map((a) => a.trim()).filter(Boolean) ?? [];
  const choreographers = parsed.choreographers?.map((a) => a.trim()).filter(Boolean) ?? [];
  const productions = parsed.productions?.map((a) => a.trim()).filter(Boolean) ?? [];
  const hasCreditEntities =
    artists.length > 0 || choreographers.length > 0 || productions.length > 0;

  // Credit entity names must not land in keyword — profile keyword search does not
  // scan experiences/credits, so phrases like "worked with Sabrina Carpenter" would
  // zero out otherwise-valid credit matches.
  const keywordParts = [
    parsed.nameQuery?.trim(),
    ...(parsed.skills ?? []),
    hasCreditEntities ? undefined : parsed.broadExperienceQuery?.trim(),
  ].filter(Boolean);
  const height = heightRangeFromNl(parsed.heightMin, parsed.heightMax);
  const styles = parsed.danceStyles?.length ? parsed.danceStyles : parsed.genres;
  const genres = (styles ?? []).map((item) => item.trim()).filter(Boolean);
  const skills = (parsed.skills ?? []).map((item) => item.trim()).filter(Boolean);
  const ethnicities = (parsed.ethnicities ?? []).map((item) => item.trim()).filter(Boolean);
  const hairColors = (parsed.hairColors ?? []).map((item) => item.trim()).filter(Boolean);
  const eyeColors = (parsed.eyeColors ?? []).map((item) => item.trim()).filter(Boolean);

  return {
    keyword: keywordParts.join(" "),
    location: parsed.location?.trim() ?? "",
    representation:
      parsed.hasRepresentation || parsed.representedOnly ? "Represented" : "",
    agency: parsed.agencies?.[0]?.trim() ?? "",
    style: genres[0] ?? "",
    genres,
    skills,
    gender: parsed.gender?.trim() ?? "",
    ethnicity: ethnicities[0] ?? "",
    ethnicities,
    hairColors,
    eyeColors,
    height,
    availability: parsed.availableOnly ? "Available" : "",
    unionStatus: parsed.unionStatus?.replace("Non-Union", "Non-union") ?? "",
    subtype: parsed.talentTypes?.[0]?.trim() ?? "",
    artists,
    choreographers,
    productions,
    relationshipMatchMode: parsed.relationshipMatchMode ?? "all",
    verificationStatuses: parsed.verificationStatuses ?? [],
  };
}

export function mergeNavigatorFilters(
  base: TalentNavigatorFilters,
  patch: Partial<TalentNavigatorFilters>,
): TalentNavigatorFilters {
  const merged: TalentNavigatorFilters = { ...base };

  const stringKeys: (keyof TalentNavigatorFilters)[] = [
    "keyword",
    "location",
    "representation",
    "agency",
    "style",
    "gender",
    "ethnicity",
    "height",
    "availability",
    "unionStatus",
    "experience",
    "subtype",
    "openRoleId",
  ];

  for (const key of stringKeys) {
    const value = patch[key];
    if (typeof value === "string" && value.trim()) {
      (merged[key] as string) = value.trim();
    }
  }

  if (patch.artists?.length) merged.artists = patch.artists;
  if (patch.choreographers?.length) merged.choreographers = patch.choreographers;
  if (patch.productions?.length) merged.productions = patch.productions;
  if (patch.resolvedArtistIds?.length) merged.resolvedArtistIds = patch.resolvedArtistIds;
  if (patch.resolvedChoreographerIds?.length) {
    merged.resolvedChoreographerIds = patch.resolvedChoreographerIds;
  }
  if (patch.resolvedProductionIds?.length) {
    merged.resolvedProductionIds = patch.resolvedProductionIds;
  }
  if (patch.genres) {
    merged.genres = patch.genres;
    merged.style = patch.genres[0] ?? "";
  }
  if (patch.skills) merged.skills = patch.skills;
  if (patch.ethnicities) {
    merged.ethnicities = patch.ethnicities;
    merged.ethnicity = patch.ethnicities[0] ?? "";
  }
  if (patch.hairColors) merged.hairColors = patch.hairColors;
  if (patch.eyeColors) merged.eyeColors = patch.eyeColors;
  if (patch.locations?.length) {
    merged.locations = patch.locations;
    merged.location = patch.locations[0] ?? merged.location;
  }
  if (patch.agencies?.length) {
    merged.agencies = patch.agencies;
    merged.agency = patch.agencies[0] ?? merged.agency;
  }
  if (patch.relationshipMatchMode) merged.relationshipMatchMode = patch.relationshipMatchMode;
  if (patch.verificationStatuses?.length) merged.verificationStatuses = patch.verificationStatuses;

  return merged;
}

async function callOpenAiJson(prompt: string, repair = false): Promise<unknown | null> {
  const messages = repair
    ? [
        { role: "system" as const, content: TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT },
        { role: "user" as const, content: prompt },
        { role: "system" as const, content: TALENT_NAVIGATOR_REPAIR_PROMPT },
      ]
    : [
        { role: "system" as const, content: TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT },
        { role: "user" as const, content: prompt },
      ];

  const result = await callOpenAiJsonObject({ messages, maxTokens: 900 });
  if (!result.ok) return null;
  return result.json;
}

export async function parseNlQuery(prompt: string): Promise<NlParseResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      filters: {},
      parsed: {},
      parsedDescription: "",
      confidence: 0,
      intent: buildSearchIntentFromDraft({
        originalQuery: "",
        draft: null,
        heuristicCredits: null,
      }),
    };
  }

  const heuristic = heuristicCreditParse(trimmed);
  let aiUnavailable = false;

  let raw = await callOpenAiJson(trimmed, false);
  if (!raw) {
    raw = await callOpenAiJson(trimmed, true);
  }
  if (!raw) {
    aiUnavailable = true;
  }

  let draft = null;
  if (raw) {
    const validated = validateLlmDraft(raw);
    if (validated.ok) {
      draft = validated.draft;
    } else {
      // Accept loosely shaped legacy JSON as NlParsedFilters
      draft = raw as Parameters<typeof buildSearchIntentFromDraft>[0]["draft"];
    }
  }

  if (!draft && !heuristic && !heuristicReferenceParse(trimmed).length) {
    const intent = buildSearchIntentFromDraft({
      originalQuery: trimmed,
      draft: null,
      heuristicCredits: null,
      aiUnavailable,
    });
    return {
      filters: { keyword: trimmed },
      parsed: { nameQuery: trimmed },
      parsedDescription: `Searching for "${trimmed}"`,
      confidence: 0.2,
      parseFailed: true,
      aiUnavailable,
      intent,
    };
  }

  if (heuristic && draft) {
    draft = {
      ...draft,
      artists: draft.artists?.length ? draft.artists : heuristic.artists,
      choreographers: draft.choreographers?.length
        ? draft.choreographers
        : heuristic.choreographers,
      productions: draft.productions?.length ? draft.productions : heuristic.productions,
      relationshipMatchMode:
        draft.relationshipMatchMode ?? heuristic.relationshipMatchMode,
      hairColors: draft.hairColors?.length ? draft.hairColors : heuristic.hairColors,
      danceStyles: draft.danceStyles?.length ? draft.danceStyles : heuristic.danceStyles,
      genres: draft.genres?.length ? draft.genres : heuristic.genres,
    };
  }

  const intent = buildSearchIntentFromDraft({
    originalQuery: trimmed,
    draft,
    heuristicCredits: heuristic,
    aiUnavailable,
  });

  const parsed: NlParsedFilters = draft
    ? { ...draftToNlParsed(draft), ...(heuristic ?? {}) }
    : (heuristic ?? { nameQuery: trimmed });

  // Prefer intent-derived filters (includes height ranges + hair)
  const fromLegacy = mapNlParsedToNavigatorFilters(parsed);
  const { searchIntentToNavigatorFilters } = await import(
    "@/lib/talent-navigator/build-search-intent"
  );
  const fromIntent = searchIntentToNavigatorFilters(intent, parsed);
  const filters = { ...fromLegacy, ...fromIntent };

  const labels = buildDescriptionLabels(parsed);
  const parsedDescription =
    intentParsedDescription(intent) ||
    (labels.length ? labels.join(" · ") : `Searching for "${trimmed}"`);
  const confidence = intent.hardFilters.length || intent.relationships.length
    ? aiUnavailable
      ? 0.75
      : 0.9
    : 0.4;

  return {
    filters,
    parsed,
    parsedDescription,
    confidence,
    aiUnavailable,
    intent,
  };
}

function formatNaturalList(items: string[], conjunction = "and"): string {
  const trimmed = items.map((item) => item.trim()).filter(Boolean);
  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return trimmed[0];
  if (trimmed.length === 2) return `${trimmed[0]} ${conjunction} ${trimmed[1]}`;
  return `${trimmed.slice(0, -1).join(", ")}, ${conjunction} ${trimmed[trimmed.length - 1]}`;
}

export function buildSearchReasoning(input: {
  count: number;
  parsedDescription: string;
  topTalentNames: string[];
  activeFilters: TalentNavigatorFilters;
  verifiedCount?: number;
  warnings?: string[];
  locationCount?: number;
  degraded?: boolean;
}): { prose: string } {
  const sentences: string[] = [];
  const count = input.count;
  const creditParts = [
    ...input.activeFilters.artists,
    ...input.activeFilters.choreographers,
    ...input.activeFilters.productions,
  ].filter(Boolean);

  if (count === 0) {
    sentences.push("I couldn't find any dancers that match this brief yet.");
  } else if (creditParts.length > 0) {
    sentences.push(
      `I found ${count.toLocaleString()} dancer${count === 1 ? "" : "s"} with credits connected to ${formatNaturalList(creditParts.slice(0, 3))}.`,
    );
  } else {
    sentences.push(
      `I found ${count.toLocaleString()} dancer${count === 1 ? "" : "s"} that fit what you're looking for.`,
    );
  }

  if (count > 0 && input.topTalentNames.length) {
    sentences.push(
      `Strong fits include ${formatNaturalList(input.topTalentNames.slice(0, 3))}.`,
    );
  }

  if (input.verifiedCount != null && input.verifiedCount > 0 && count > 0) {
    const verifiedCount = input.verifiedCount;
    sentences.push(
      `${verifiedCount} of them ${verifiedCount === 1 ? "has" : "have"} industry-confirmed or Motiion-verified credits.`,
    );
  }

  if (
    input.locationCount != null &&
    input.activeFilters.location &&
    count > 0 &&
    input.locationCount < count
  ) {
    const locationCount = input.locationCount;
    sentences.push(
      `${locationCount} ${locationCount === 1 ? "is" : "are"} based in ${input.activeFilters.location}.`,
    );
  }

  if (input.degraded) {
    sentences.push("I'm using structured filters while AI parsing is unavailable.");
  }

  if (input.warnings?.length) {
    for (const warning of input.warnings.slice(0, 2)) {
      sentences.push(warning.endsWith(".") ? warning : `${warning}.`);
    }
  }

  return { prose: sentences.join(" ") };
}

export function clearNavigatorFilters(): TalentNavigatorFilters {
  return {
    ...EMPTY_NAVIGATOR_FILTERS,
    artists: [],
    choreographers: [],
    productions: [],
    resolvedArtistIds: [],
    resolvedChoreographerIds: [],
    resolvedProductionIds: [],
    verificationStatuses: [],
  };
}

export function creditResultsToReasoning(
  talent: CreditSearchResultTalent[],
  filters: TalentNavigatorFilters,
  parsedDescription: string,
  warningMessages: string[],
  degraded?: boolean,
): { prose: string } {
  const verifiedCount = talent.filter((t) =>
    t.matchingCredits.some((c) => {
      const status = c.verificationStatus as VerificationStatus | undefined;
      return status === "motiion_verified" || status === "industry_confirmed";
    }),
  ).length;
  const locationCount = filters.location
    ? talent.filter((t) =>
        (t.location ?? "").toLowerCase().includes(filters.location.toLowerCase()),
      ).length
    : undefined;

  return buildSearchReasoning({
    count: talent.length,
    parsedDescription,
    topTalentNames: talent.slice(0, 5).map((t) => t.name),
    activeFilters: filters,
    verifiedCount,
    locationCount,
    warnings: warningMessages,
    degraded,
  });
}

export { inchesToHeightLabel };
