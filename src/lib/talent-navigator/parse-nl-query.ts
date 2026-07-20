import { HEIGHT_OPTIONS } from "@/lib/talent-navigator/filter-options";
import { TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT, TALENT_NAVIGATOR_REPAIR_PROMPT } from "@/lib/talent-navigator/prompts";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import type { CreditSearchResultTalent } from "@/lib/talent-navigator/result-transform";
import type { VerificationStatus } from "@/lib/talent-navigator/credit-types";

export const NL_QUERY_SYSTEM_PROMPT = TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT;

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

export type NlParseResult = {
  filters: Partial<TalentNavigatorFilters>;
  parsed: NlParsedFilters;
  parsedDescription: string;
  confidence: number;
  parseFailed?: boolean;
};

function parseHeightInches(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*['′]\s*(\d+)/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

function heightToBucket(min?: string, max?: string): string {
  const minInches = parseHeightInches(min);
  const maxInches = parseHeightInches(max);
  const inches = minInches ?? maxInches;
  if (inches === null) return "";
  if (inches < 66) return HEIGHT_OPTIONS[0];
  if (inches <= 69) return HEIGHT_OPTIONS[1];
  return HEIGHT_OPTIONS[2];
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
  const keywordParts = [
    parsed.nameQuery?.trim(),
    ...(parsed.skills ?? []),
    parsed.broadExperienceQuery?.trim(),
  ].filter(Boolean);
  const height = heightToBucket(parsed.heightMin, parsed.heightMax);
  const styles = parsed.danceStyles?.length ? parsed.danceStyles : parsed.genres;

  return {
    keyword: keywordParts.join(" "),
    location: parsed.location?.trim() ?? "",
    representation:
      parsed.hasRepresentation || parsed.representedOnly ? "Represented" : "",
    agency: parsed.agencies?.[0]?.trim() ?? "",
    style: styles?.[0]?.trim() ?? "",
    gender: parsed.gender?.trim() ?? "",
    ethnicity: parsed.ethnicities?.[0]?.trim() ?? "",
    height,
    availability: parsed.availableOnly ? "Available" : "",
    unionStatus: parsed.unionStatus?.replace("Non-Union", "Non-union") ?? "",
    subtype: parsed.talentTypes?.[0]?.trim() ?? "",
    artists: parsed.artists?.map((a) => a.trim()).filter(Boolean) ?? [],
    choreographers: parsed.choreographers?.map((a) => a.trim()).filter(Boolean) ?? [],
    productions: parsed.productions?.map((a) => a.trim()).filter(Boolean) ?? [],
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
  if (patch.relationshipMatchMode) merged.relationshipMatchMode = patch.relationshipMatchMode;
  if (patch.verificationStatuses?.length) merged.verificationStatuses = patch.verificationStatuses;

  return merged;
}

async function callOpenAiJson(prompt: string, repair = false): Promise<NlParsedFilters | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const messages = repair
    ? [
        { role: "system", content: TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
        { role: "system", content: TALENT_NAVIGATOR_REPAIR_PROMPT },
      ]
    : [
        { role: "system", content: TALENT_NAVIGATOR_CREDIT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 450,
      messages,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as NlParsedFilters;
  } catch {
    return null;
  }
}

export async function parseNlQuery(prompt: string): Promise<NlParseResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { filters: {}, parsed: {}, parsedDescription: "", confidence: 0 };
  }

  let parsed = await callOpenAiJson(trimmed, false);
  if (!parsed) {
    parsed = await callOpenAiJson(trimmed, true);
  }

  if (!parsed) {
    return {
      filters: { keyword: trimmed },
      parsed: { nameQuery: trimmed },
      parsedDescription: `Searching for "${trimmed}"`,
      confidence: 0.2,
      parseFailed: true,
    };
  }

  const labels = buildDescriptionLabels(parsed);
  const filters = mapNlParsedToNavigatorFilters(parsed);
  const parsedDescription = labels.length ? labels.join(" · ") : `Searching for "${trimmed}"`;
  const confidence = labels.length ? 0.9 : 0.4;

  return { filters, parsed, parsedDescription, confidence };
}

export function buildSearchReasoning(input: {
  count: number;
  parsedDescription: string;
  topTalentNames: string[];
  activeFilters: TalentNavigatorFilters;
  verifiedCount?: number;
  warnings?: string[];
  locationCount?: number;
}): { headline: string; bullets: string[] } {
  const bullets: string[] = [];
  if (input.parsedDescription) bullets.push(input.parsedDescription);

  if (input.verifiedCount != null && input.count > 0) {
    bullets.push(
      `${input.verifiedCount} ${input.verifiedCount === 1 ? "has" : "have"} industry-confirmed or Motiion-verified credits.`,
    );
  }

  if (input.locationCount != null && input.activeFilters.location) {
    bullets.push(
      `${input.locationCount} ${input.locationCount === 1 ? "is" : "are"} based in ${input.activeFilters.location}.`,
    );
  }

  if (input.warnings?.length) {
    bullets.push(...input.warnings.slice(0, 3));
  }

  if (input.topTalentNames.length) {
    bullets.push(`Strongest matches include ${input.topTalentNames.slice(0, 3).join(", ")}.`);
  }

  const creditParts = [
    ...input.activeFilters.artists,
    ...input.activeFilters.choreographers,
    ...input.activeFilters.productions,
  ];
  const headline =
    creditParts.length > 0
      ? `I found ${input.count.toLocaleString()} dancer${input.count === 1 ? "" : "s"} with credits connected to ${creditParts.slice(0, 3).join(", ")}.`
      : `Found ${input.count.toLocaleString()} dancer${input.count === 1 ? "" : "s"} matching your request.`;

  return { headline, bullets };
}

export function clearNavigatorFilters(): TalentNavigatorFilters {
  return { ...EMPTY_NAVIGATOR_FILTERS, artists: [], choreographers: [], productions: [], resolvedArtistIds: [], resolvedChoreographerIds: [], resolvedProductionIds: [], verificationStatuses: [] };
}

export function creditResultsToReasoning(
  talent: CreditSearchResultTalent[],
  filters: TalentNavigatorFilters,
  parsedDescription: string,
  warningMessages: string[],
): { headline: string; bullets: string[] } {
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
  });
}
