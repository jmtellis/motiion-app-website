import { HEIGHT_OPTIONS } from "@/lib/talent-navigator/filter-options";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";

export const NL_QUERY_SYSTEM_PROMPT = `You are a natural-language query parser for a talent search experience.
Convert the user's message into structured search filters that match manual filter behavior.

Return ONLY a JSON object.

OUTPUT SCHEMA (optional fields)
{
  "gender": "Male" | "Female" | "Non-binary",
  "ethnicities": [string],
  "heightMin": "X'Y\\"",
  "heightMax": "X'Y\\"",
  "hairColors": [ "Black" | "Blonde" | "Brown" | "Red" | "Other" ],
  "eyeColors": [ "Amber" | "Blue" | "Brown" | "Green" | "Gray" | "Mixed" ],
  "talentTypes": [ "Dancer" | "Choreographer" ],
  "location": string,
  "unionStatus": "SAG-AFTRA" | "SAG-AFTRA Eligible" | "Non-union" | "Non-Union",
  "hasRepresentation": true,
  "agencies": [string],
  "genres": [string],
  "skills": [string],
  "nameQuery": string
}

DO NOT include fields that are not clearly requested.
If nothing is clear, return {"nameQuery":"<original query>"}.

Prefer filter values exactly as a user would set in the filter sheet.
Ethnicity is multi-select => use "ethnicities" array.
Profile type only supports "Dancer" and "Choreographer" => map to "talentTypes".
Normalize heights to X'Y" format. Location abbreviations: LA => Los Angeles, NYC => New York.
"represented", "has representation", "with an agent" => hasRepresentation=true.
Union: SAG/union member => SAG-AFTRA; non-union => Non-union.`;

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
};

export type NlParseResult = {
  filters: Partial<TalentNavigatorFilters>;
  parsedDescription: string;
  confidence: number;
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
  if (parsed.gender) labels.push(`Gender: ${parsed.gender}`);
  if (parsed.ethnicities?.length) labels.push(`Ethnicity: ${parsed.ethnicities.join(", ")}`);
  if (parsed.heightMin || parsed.heightMax) {
    labels.push(`Height: ${parsed.heightMin ?? "any"} – ${parsed.heightMax ?? "any"}`);
  }
  if (parsed.talentTypes?.length) labels.push(`Type: ${parsed.talentTypes.join(", ")}`);
  if (parsed.location) labels.push(`Location: ${parsed.location}`);
  if (parsed.unionStatus) labels.push(`Union: ${parsed.unionStatus}`);
  if (parsed.hasRepresentation) labels.push("Represented");
  if (parsed.agencies?.length) labels.push(`Agency: ${parsed.agencies.join(", ")}`);
  if (parsed.genres?.length) labels.push(`Style: ${parsed.genres.join(", ")}`);
  if (parsed.skills?.length) labels.push(`Skills: ${parsed.skills.join(", ")}`);
  return labels;
}

export function mapNlParsedToNavigatorFilters(parsed: NlParsedFilters): Partial<TalentNavigatorFilters> {
  const keywordParts = [parsed.nameQuery?.trim(), ...(parsed.skills ?? [])].filter(Boolean);
  const height = heightToBucket(parsed.heightMin, parsed.heightMax);

  return {
    keyword: keywordParts.join(" "),
    location: parsed.location?.trim() ?? "",
    representation: parsed.hasRepresentation ? "Represented" : "",
    agency: parsed.agencies?.[0]?.trim() ?? "",
    style: parsed.genres?.[0]?.trim() ?? "",
    gender: parsed.gender?.trim() ?? "",
    ethnicity: parsed.ethnicities?.[0]?.trim() ?? "",
    height,
    unionStatus: parsed.unionStatus?.replace("Non-Union", "Non-union") ?? "",
    subtype: parsed.talentTypes?.[0]?.trim() ?? "",
  };
}

export function mergeNavigatorFilters(
  base: TalentNavigatorFilters,
  patch: Partial<TalentNavigatorFilters>,
): TalentNavigatorFilters {
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch) as [keyof TalentNavigatorFilters, string][]) {
    if (value && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

export async function parseNlQuery(prompt: string): Promise<NlParseResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { filters: {}, parsedDescription: "", confidence: 0 };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      filters: { keyword: trimmed },
      parsedDescription: `Searching for "${trimmed}"`,
      confidence: 0.3,
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 250,
      messages: [
        { role: "system", content: NL_QUERY_SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return {
      filters: { keyword: trimmed },
      parsedDescription: `Searching for "${trimmed}"`,
      confidence: 0.2,
    };
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return { filters: { keyword: trimmed }, parsedDescription: `Searching for "${trimmed}"`, confidence: 0.2 };
  }

  let parsed: NlParsedFilters;
  try {
    parsed = JSON.parse(content) as NlParsedFilters;
  } catch {
    return { filters: { keyword: trimmed }, parsedDescription: `Searching for "${trimmed}"`, confidence: 0.2 };
  }

  const labels = buildDescriptionLabels(parsed);
  const filters = mapNlParsedToNavigatorFilters(parsed);
  const parsedDescription = labels.length ? labels.join(" · ") : `Searching for "${trimmed}"`;
  const confidence = labels.length ? 0.9 : 0.4;

  return { filters, parsedDescription, confidence };
}

export function buildSearchReasoning(input: {
  count: number;
  parsedDescription: string;
  topTalentNames: string[];
  activeFilters: TalentNavigatorFilters;
}): { headline: string; bullets: string[] } {
  const activeLabels = Object.entries(input.activeFilters)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`);

  const bullets: string[] = [];
  if (input.parsedDescription) bullets.push(input.parsedDescription);
  if (activeLabels.length) bullets.push(`Active filters — ${activeLabels.slice(0, 4).join(", ")}`);
  if (input.topTalentNames.length) {
    bullets.push(`Strongest matches include ${input.topTalentNames.slice(0, 3).join(", ")}.`);
  }

  return {
    headline: `Found ${input.count.toLocaleString()} dancer${input.count === 1 ? "" : "s"} matching your request.`,
    bullets,
  };
}

export function clearNavigatorFilters(): TalentNavigatorFilters {
  return { ...EMPTY_NAVIGATOR_FILTERS };
}
